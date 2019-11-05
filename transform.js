'use strict';

const { relative, resolve } = require('path');

const COMPLETION_PATH = resolve('./src/completion.mjs');
const ABSTRACT_OPS_PATH = resolve('./src/abstract-ops/all.mjs');
const VALUE_PATH = resolve('./src/value.mjs');

function fileToImport(file, refPath) {
  return relative(file.opts.filename, refPath)
    .replace(/\\/g, '/') // Support building on Windows
    .replace('../', './');
}

function findParentStatementPath(path) {
  while (path && !path.isStatement()) {
    path = path.parentPath;
  }
  return path;
}

module.exports = ({ types: t, template }) => {
  function createImportCompletion(file) {
    const r = fileToImport(file, COMPLETION_PATH);
    return template.ast(`
      import { Completion } from "${r}";
    `);
  }

  function createImportAbruptCompletion(file) {
    const r = fileToImport(file, COMPLETION_PATH);
    return template.ast(`
      import { AbruptCompletion } from "${r}";
    `);
  }

  function createImportAssert(file) {
    const r = fileToImport(file, ABSTRACT_OPS_PATH);
    return template.ast(`
      import { Assert } from "${r}";
    `);
  }

  function createImportCall(file) {
    const r = fileToImport(file, ABSTRACT_OPS_PATH);
    return template.ast(`
      import { Call } from "${r}";
    `);
  }

  function createImportValue(file) {
    const r = fileToImport(file, VALUE_PATH);
    return template.ast(`
      import { Value } from "${r}";
    `);
  }

  const MACROS = {
    Q: {
      template: template`
      let ID = ARGUMENT;
      if (ID instanceof AbruptCompletion) {
        return ID;
      }
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `,
      imports: ['AbruptCompletion', 'Completion'],
    },
    X: {
      template: template`
      let ID = ARGUMENT;
      Assert(!(ID instanceof AbruptCompletion));
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `,
      imports: ['Assert', 'Completion', 'AbruptCompletion'],
    },
    IfAbruptRejectPromise: {
      template: template`
      if (ID instanceof AbruptCompletion) {
        const hygenicTemp2 = Call(CAPABILITY.Reject, Value.undefined, [ID.Value]);
        if (hygenicTemp2 instanceof AbruptCompletion) {
          return hygenicTemp2;
        }
        return CAPABILITY.Promise;
      }
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `,
      imports: ['Call', 'Value', 'AbruptCompletion', 'Completion'],
    },
  };
  MACROS.ReturnIfAbrupt = MACROS.Q;
  const MACRO_NAMES = Object.keys(MACROS);

  return {
    visitor: {
      Program: {
        enter(path, state) {
          state.needed = {};
        },
        exit(path, state) {
          if (state.needed.Completion && !state.file.opts.filename.endsWith('completion.mjs')) {
            path.node.body.unshift(createImportCompletion(state.file));
          }
          if (state.needed.AbruptCompletion && !state.file.opts.filename.endsWith('completion.mjs')) {
            path.node.body.unshift(createImportAbruptCompletion(state.file));
          }
          if (state.needed.Assert) {
            path.node.body.unshift(createImportAssert(state.file));
          }
          if (state.needed.Call) {
            path.node.body.unshift(createImportCall(state.file));
          }
          if (state.needed.Value) {
            path.node.body.unshift(createImportValue(state.file));
          }
        },
      },
      CallExpression(path, state) {
        if (!t.isIdentifier(path.node.callee)) {
          return;
        }

        const macroName = path.node.callee.name;
        if (MACRO_NAMES.includes(macroName)) {
          const macro = MACROS[macroName];
          const [argument] = path.node.arguments;

          if (macro === MACROS.Q && t.isReturnStatement(path.parentPath)) {
            path.replaceWith(argument);
            return;
          }

          const statementPath = findParentStatementPath(path);

          macro.imports.forEach((i) => {
            state.needed[i] = path.scope.getBinding(i) === undefined;
          });

          if (macro === MACROS.Q && t.isIdentifier(argument)) {
            const binding = path.scope.getBinding(argument.name);
            binding.path.parent.kind = 'let';
            statementPath.insertBefore(template.ast`
              if (${argument} instanceof AbruptCompletion) {
                return ${argument};
              }
              if (${argument} instanceof Completion) {
                ${argument} = ${argument}.Value;
              }
            `);
            path.replaceWith(argument);
          } else {
            const id = statementPath.scope.generateUidIdentifier();

            let expansion;
            if (macro === MACROS.IfAbruptRejectPromise) {
              const [, capability] = path.node.arguments;
              if (!t.isIdentifier(argument)) {
                throw path.get('arguments.0').buildCodeFrameError('First argument to IfAbruptRejectPromise should be an identifier');
              }
              if (!t.isIdentifier(capability)) {
                throw path.get('arguments.1').buildCodeFrameError('Second argument to IfAbruptRejectPromise should be an identifier');
              }
              const binding = path.scope.getBinding(argument.name);
              binding.path.parent.kind = 'let';
              expansion = macro.template({ ID: argument, CAPABILITY: capability });
            } else {
              expansion = macro.template({ ARGUMENT: argument, ID: id });
            }
            statementPath.insertBefore(expansion);

            path.replaceWith(id);
          }
        } else if (macroName === 'Assert') {
          path.node.arguments.push(t.stringLiteral(path.get('arguments.0').getSource()));
        }
      },
    },
  };
};
