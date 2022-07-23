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

function getEnclosingConditionalExpression(path) {
  while (path && !path.isStatement()) {
    if (path.isConditionalExpression()) {
      return path;
    }
    path = path.parentPath;
  }
  return null;
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

  function createImportIteratorClose(file) {
    const r = fileToImport(file, ABSTRACT_OPS_PATH);
    return template.statement.ast`
      import { IteratorClose } from "${r}";
    `;
  }

  function createImportValue(file) {
    const r = fileToImport(file, VALUE_PATH);
    return template.ast(`
      import { Value } from "${r}";
    `);
  }

  function addSectionFromComments(path) {
    if (path.node.leadingComments) {
      for (const c of path.node.leadingComments) {
        const lines = c.value.split('\n');
        for (const line of lines) {
          if (/#sec/.test(line)) {
            const section = line.split(' ').find((l) => l.includes('#sec'));
            const url = section.includes('https') ? section : `https://tc39.es/ecma262/${section}`;
            path.insertAfter(template.ast(`${path.node.id ? path.node.id.name : path.node.declarations[0].id.name}.section = '${url}';`));
            return;
          }
        }
      }
    }
  }

  const MACROS = {
    Q: {
      template: template(`
      let ID = ARGUMENT;
      /* c8 ignore if */
      if (ID instanceof AbruptCompletion) {
        return ID;
      }
      /* c8 ignore if */
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `, { preserveComments: true }),
      imports: ['AbruptCompletion', 'Completion'],
    },
    X: {
      template: template(`
      let ID = ARGUMENT;
      Assert(!(ID instanceof AbruptCompletion), SOURCE + ' returned an abrupt completion');
      /* c8 ignore if */
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `, { preserveComments: true }),
      imports: ['Assert', 'Completion', 'AbruptCompletion'],
    },
    IfAbruptCloseIterator: {
      template: template(`
      /* c8 ignore if */
      if (%%value%% instanceof AbruptCompletion) {
        return IteratorClose(%%iteratorRecord%%, %%value%%);
      }
      /* c8 ignore if */
      if (%%value%% instanceof Completion) {
        %%value%% = %%value%%.Value;
      }
      `, { preserveComments: true }),
      imports: ['IteratorClose', 'AbruptCompletion', 'Completion'],
    },
    IfAbruptRejectPromise: {
      template: template(`
      /* c8 ignore if */
      if (ID instanceof AbruptCompletion) {
        const hygenicTemp2 = Call(CAPABILITY.Reject, Value.undefined, [ID.Value]);
        if (hygenicTemp2 instanceof AbruptCompletion) {
          return hygenicTemp2;
        }
        return CAPABILITY.Promise;
      }
      /* c8 ignore if */
      if (ID instanceof Completion) {
        ID = ID.Value;
      }
      `, { preserveComments: true }),
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
          if (state.needed.IteratorClose) {
            path.unshiftContainer('body', createImportIteratorClose(state.file));
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
          const enclosingConditional = getEnclosingConditionalExpression(path);
          if (enclosingConditional !== null) {
            if (enclosingConditional.parentPath.isVariableDeclarator()) {
              const declaration = enclosingConditional.parentPath.parentPath;
              const id = enclosingConditional.parentPath.get('id');
              declaration.replaceWithMultiple(template.ast(`
              let ${id};
              if (${enclosingConditional.get('test')}) {
                ${id} = ${enclosingConditional.get('consequent')}
              } else {
                ${id} = ${enclosingConditional.get('alternate')}
              }
              `));
              return;
            } else {
              throw path.buildCodeFrameError('Macros may not be used within conditional expressions');
            }
          }

          const macro = MACROS[macroName];
          const [argument] = path.node.arguments;

          if (macro === MACROS.Q && (t.isReturnStatement(path.parentPath) || path.parentPath.isArrowFunctionExpression())) {
            path.replaceWith(path.node.arguments[0]);
            return;
          }

          if (path.parentPath.isArrowFunctionExpression()) {
            throw path.buildCodeFrameError('Macros may not be the sole expression of an arrow function');
          }

          const statementPath = findParentStatementPath(path);

          macro.imports.forEach((i) => {
            state.needed[i] = path.scope.getBinding(i) === undefined;
          });

          if (macro === MACROS.Q && t.isIdentifier(argument)) {
            const binding = path.scope.getBinding(argument.name);
            binding.path.parent.kind = 'let';
            statementPath.insertBefore(template(`
              /* c8 ignore if */
              if (ID instanceof AbruptCompletion) {
                return ID;
              }
              /* c8 ignore if */
              if (ID instanceof Completion) {
                ID = ID.Value;
              }
            `, { preserveComments: true })({ ID: argument }));
            path.replaceWith(argument);
          } else {
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
              statementPath.insertBefore(macro.template({ ID: argument, CAPABILITY: capability }));
              path.remove();
            } else if (macro === MACROS.IfAbruptCloseIterator) {
              if (!t.isIdentifier(argument)) {
                throw path.get('arguments.0').buildCodeFrameError('First argument to IfAbruptCloseIterator should be an identifier');
              }
              const iteratorRecord = path.get('arguments.1');
              if (!iteratorRecord.isIdentifier()) {
                throw iteratorRecord.buildCodeFrameError('Second argument to IfAbruptCloseIterator should be an identifier');
              }
              const binding = path.scope.getBinding(argument.name);
              binding.path.parent.kind = 'let';
              statementPath.insertBefore(
                macro.template({
                  value: argument,
                  iteratorRecord: iteratorRecord.node,
                }),
              );
              path.remove();
            } else {
              const id = statementPath.scope.generateUidIdentifier();
              const replacement = {
                ARGUMENT: argument,
                ID: id,
              };
              if (macro === MACROS.X) {
                replacement.SOURCE = t.stringLiteral(path.get('arguments.0').getSource());
              }
              statementPath.insertBefore(macro.template(replacement));
              path.replaceWith(id);
            }
          }
        } else if (macroName === 'Assert') {
          path.node.arguments.push(t.stringLiteral(path.get('arguments.0').getSource()));
        }
      },
      SwitchCase(path) {
        const n = path.node.consequent[0];
        if (t.isThrowStatement(n) && t.isNewExpression(n.argument) && n.argument.callee.name === 'OutOfRange') {
          path.node.leadingComments = path.node.leadingComments || [];
          path.node.leadingComments.push({ type: 'CommentBlock', value: 'c8 ignore next' });
        }
      },
      FunctionDeclaration(path) {
        addSectionFromComments(path);
      },
      VariableDeclaration(path) {
        if (path.get('declarations.0.init').isArrowFunctionExpression()) {
          addSectionFromComments(path);
        }
      },
    },
  };
};
