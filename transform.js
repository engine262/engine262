'use strict';

const { relative, resolve } = require('path');

const COMPLETION_PATH = resolve('./src/completion.mjs');
const NOTATIONAL_CONVENTIONS_PATH = resolve('./src/abstract-ops/all.mjs');

module.exports = ({ types: t, template }) => {
  function createImportCompletion(file) {
    const r = relative(file.opts.filename, COMPLETION_PATH).replace('../', './');
    return template.ast(`
      import { Completion, AbruptCompletion } from "${r}";
    `);
  }

  function createImportAssertAndCall(file) {
    const r = relative(file.opts.filename, NOTATIONAL_CONVENTIONS_PATH).replace('../', './');
    return template.ast(`
      import { Assert, Call } from "${r}";
    `);
  }

  // Take care not to evaluate ARGUMENT multiple times.
  const templates = {
    Q: {
      dontCare: template.statement(`
        {
          const hygienicTemp = ARGUMENT;
          if (hygienicTemp instanceof AbruptCompletion) {
            return hygienicTemp;
          }
        }
      `),
      newVariable: template.statements(`
        let ID = ARGUMENT;
        if (ID instanceof AbruptCompletion) {
          return ID;
        }
        if (ID instanceof Completion) {
          ID = ID.Value;
        }
      `),
      existingVariable: template.statements(`
        ID = ARGUMENT;
        if (ID instanceof AbruptCompletion) {
          return ID;
        }
        if (ID instanceof Completion) {
          ID = ID.Value;
        }
      `),
    },
    X: {
      dontCare: template.statement(`
        Assert(!(ARGUMENT instanceof AbruptCompletion));
      `),
      newVariable: template.statements(`
        let ID = ARGUMENT;
        Assert(!(ID instanceof AbruptCompletion));
        if (ID instanceof Completion) {
          ID = ID.Value;
        }
      `),
      existingVariable: template.statements(`
        ID = ARGUMENT;
        Assert(!(ID instanceof AbruptCompletion));
        if (ID instanceof Completion) {
          ID = ID.Value;
        }
      `),
    },
    Promise: {
      dontCare: template.statement(`
        if (ID instanceof AbruptCompletion) {
          const hygenicTemp2 = Call(CAPABILITY.Reject, NewValue(undefined), [ID.Value]);
          if (hygenicTemp2 instanceof AbruptCompletion) {
            return hygenicTemp2;
          }
          return CAPABILITY.Promise;
        }
      `),
    },
  };

  function findParentStatementPath(path) {
    while (path && !path.isStatement()) {
      path = path.parentPath;
    }
    return path;
  }

  // Return false for when the VariableDeclaration appears as a loop binding.
  function isActualVariableDeclaration(path) {
    return (
      !(t.isForInStatement(path.parent) && path.parentKey === 'left')
      && !(t.isForStatement(path.parent) && path.parentKey === 'init')
    );
  }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          if (state.file.opts.filename === COMPLETION_PATH) {
            return;
          }
          state.foundCompletion = false;
          state.needCompletion = false;
          state.foundAssertAndCall = false;
          state.needAssertAndCall = false;
        },
        exit(path, state) {
          if (!state.foundCompletion && state.needCompletion) {
            path.node.body.unshift(createImportCompletion(state.file));
          }
          if (!state.foundAssertAndCall && state.needAssertAndCall) {
            path.node.body.unshift(createImportAssertAndCall(state.file));
          }
        },
      },
      ImportDeclaration(path, state) {
        if (path.node.source.value.endsWith('completion.mjs')) {
          state.foundCompletion = true;
          if (!path.node.specifiers.find((s) => s.local.name === 'Completion')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('Completion'), t.Identifier('Completion')),
            );
          }
          if (!path.node.specifiers.find((s) => s.local.name === 'AbruptCompletion')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('AbruptCompletion'), t.Identifier('AbruptCompletion')),
            );
          }
        }
        if (path.node.source.value.endsWith('abstract-ops/all.mjs')
            || (state.file.opts.filename.includes('abstract-ops') && path.node.source.value === './all.mjs')) {
          if (state.file.opts.filename.endsWith('api.mjs')) {
            return;
          }
          state.foundAssertAndCall = true;
          if (!path.node.specifiers.find((s) => s.local.name === 'Assert')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('Assert'), t.Identifier('Assert')),
            );
          }
          if (!path.node.specifiers.find((s) => s.local.name === 'Call') && !state.file.opts.filename.endsWith('object-operations.mjs')) {
            path.node.specifiers.push(
              t.ImportSpecifier(t.Identifier('Call'), t.Identifier('Call')),
            );
          }
        }
      },
      CallExpression(path, state) {
        if (!t.isIdentifier(path.node.callee)) {
          return;
        }
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
          const [argument] = path.node.arguments;

          if (t.isReturnStatement(path.parentPath)) {
            path.replaceWith(argument);
            return;
          }

          state.needCompletion = true;

          if (t.isIdentifier(argument)) {
            // ReturnIfAbrupt(argument)
            const binding = path.scope.getBinding(argument.name);
            binding.path.parent.kind = 'let';

            const parentStatement = findParentStatementPath(path);
            parentStatement.insertBefore(template.statements.ast`
              if (${argument} instanceof AbruptCompletion) {
                return ${argument};
              }
              if (${argument} instanceof Completion) {
                ${argument} = ${argument}.Value;
              }
            `);
            if (t.isExpressionStatement(path.parent)) {
              // We don't care about the result.
              path.remove();
            } else {
              path.replaceWith(argument);
            }
          } else {
            // ReturnIfAbrupt(AbstractOperation())
            replace(templates.Q, 'hygienicTemp');
          }
        } else if (path.node.callee.name === 'X') {
          state.needCompletion = true;
          state.needAssertAndCall = true;
          replace(templates.X, 'val');
        } else if (path.node.callee.name === 'IfAbruptRejectPromise') {
          state.needCompletion = true;
          state.needAssertAndCall = true;
          const [ID, CAPABILITY] = path.node.arguments;
          path.parentPath.replaceWith(templates.Promise.dontCare({ ID, CAPABILITY }));
        } else if (path.node.callee.name === 'Assert') {
          path.node.arguments.push(t.stringLiteral(path.get('arguments')[0].getSource()));
        }

        function replace(templateObj, temporaryVariableName) {
          const [ARGUMENT] = path.node.arguments;
          if (t.isExpressionStatement(path.parent)) {
            // We don't care about the result.
            path.parentPath.replaceWith(templateObj.dontCare({ ARGUMENT }));
          } else if (
            t.isVariableDeclarator(path.parent)
            && t.isIdentifier(path.parent.id)
            && isActualVariableDeclaration(path.parentPath.parentPath)
          ) {
            // The result is assigned to a new variable, verbatim.
            const declarator = path.parentPath;
            const declaration = declarator.parentPath;
            const ID = declarator.node.id;
            declaration.insertBefore(templateObj.newVariable({ ID, ARGUMENT }));
            if (declaration.node.declarations.length === 1) {
              declaration.remove();
            } else {
              declarator.remove();
            }
          } else if (
            t.isAssignmentExpression(path.parent)
            && t.isIdentifier(path.parent.left)
            && t.isExpressionStatement(path.parentPath.parent)
          ) {
            // The result is assigned to an existing variable, verbatim.
            const assignmentStatement = path.parentPath.parentPath;
            const ID = path.parent.left;
            assignmentStatement.replaceWithMultiple(templateObj.existingVariable({ ID, ARGUMENT }));
          } else {
            // Ugliest variant that covers everything else.
            const parentStatement = findParentStatementPath(path);
            const ID = parentStatement.scope.generateUidIdentifier(temporaryVariableName);
            parentStatement.insertBefore(templateObj.newVariable({ ID, ARGUMENT }));
            path.replaceWith(ID);
          }
        }
      },
    },
  };
};
