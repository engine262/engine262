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

  const returnIfAbruptTemplateGeneric = template.expression(`
    do {
      const hygenicTemp = ARG;
      if (hygenicTemp instanceof AbruptCompletion) {
        return hygenicTemp;
      }
      hygenicTemp instanceof Completion ? hygenicTemp.Value : hygenicTemp;
    }
  `, { plugins: ['doExpressions'] });

  const returnIfAbruptAssertTemplate = template.expression(`
    do {
      const val = ARG;
      Assert(!(val instanceof AbruptCompletion));
      val instanceof Completion ? val.Value : val;
    }
  `, { plugins: ['doExpressions'] });

  function findParentStatementPath(path) {
    while (path && !path.isStatement()) {
      path = path.parentPath;
    }
    return path;
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
            if (path.parentPath.isExpressionStatement()) {
              // We don't care about the result.
              path.remove();
            } else {
              path.replaceWith(argument);
            }
          } else {
            // ReturnIfAbrupt(AbstractOperation())
            if (path.parentPath.isExpressionStatement()) {
              // We don't care about the result.
              path.parentPath.replaceWith(template.statement.ast`
                {
                  const hygenicTemp = ${argument};
                  if (hygenicTemp instanceof AbruptCompletion) {
                    return hygenicTemp;
                  }
                }
              `);
            } else {
              path.replaceWith(returnIfAbruptTemplateGeneric({ ARG: argument }));
            }
          }
        } else if (path.node.callee.name === 'X') {
          state.needCompletion = true;
          state.needAssert = true;
          const [argument] = path.node.arguments;
          if (path.parentPath.isExpressionStatement()) {
            // We don't care about the result.
            path.parentPath.replaceWith(template.statement.ast`
              Assert(!(${argument} instanceof AbruptCompletion));
            `);
          } else {
            path.replaceWith(returnIfAbruptAssertTemplate({ ARG: argument }));
          }
        }
      },
    },
  };
};
