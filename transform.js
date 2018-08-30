'use strict';

const path = require('path');
const COMPLETION_PATH = path.resolve('./src/completion.mjs');
const NOTATIONAL_CONVENTIONS_PATH = path.resolve('./src/abstract-ops/notational-conventions.mjs');

module.exports = ({ types: t, template }) => {
  function createImportCompletion(file) {
    const r = path.relative(file.opts.filename, COMPLETION_PATH).replace('../', './');
    return template.ast(`
      import { Completion, AbruptCompletion } from "${r}";
    `);
  }

  function createImportAssert(file) {
    const r = path.relative(file.opts.filename, NOTATIONAL_CONVENTIONS_PATH).replace('../', './');
    return template.ast(`
      import { Assert } from "${r}";
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
    }
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
          state.foundAssert = false;
          state.needAssert = false;
        },
        exit(path, state) {
          if (!state.foundCompletion && state.needCompletion) {
            path.node.body.unshift(createImportCompletion(state.file));
          }
          if (!state.foundAssert && state.needAssert) {
            path.node.body.unshift(createImportAssert(state.file));
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
        if (path.node.specifiers.find((s) => s.local.name === 'Assert')) {
          state.foundAssert = true;
        }
      },
      CallExpression(path, state) {
        if (!t.isIdentifier(path.node.callee)) {
          return;
        }
        if (path.node.callee.name === 'Q' || path.node.callee.name === 'ReturnIfAbrupt') {
          state.needCompletion = true;
          const [argument] = path.node.arguments;
          if (t.isIdentifier(argument)) {
            // ReturnIfAbrupt(argument)
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
          state.needAssert = true;
          replace(templates.X, 'val');
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
