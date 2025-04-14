import { relative, resolve } from 'path';
import type {
  BabelFile, Node, NodePath,
  PluginObj, PluginPass,
  types as t,
} from '@babel/core';

const IMPORT_PATH = resolve('./src/index.mts');

function __ts_cast__<T>(_value: unknown): asserts _value is T { }

function fileToImport(file: BabelFile, refPath: string) {
  return relative(file.opts.filename!, refPath)
    .replace(/\\/g, '/') // Support building on Windows
    .replace('../', './');
}

function findParentStatementPath(path: NodePath): NodePath<t.Statement> | null {
  while (path && !path.isStatement()) {
    path = path.parentPath!;
  }
  return path;
}

function getEnclosingConditionalExpression(path: NodePath) {
  while (path && !path.isStatement()) {
    if (path.isConditionalExpression()) {
      return path;
    }
    path = path.parentPath!;
  }
  return null;
}

type NeededNames = 'Completion' | 'AbruptCompletion' | 'Assert' | 'Call' | 'IteratorClose' | 'Value' | 'skipDebugger';

interface State extends PluginPass {
  needed: Partial<Record<NeededNames, boolean>>;
}

interface Macro<R extends Record<string, Node | null> = Record<string, Node | null>> {
  template(replacements: Readonly<R>): t.Statement | t.Statement[];
  readonly imports: readonly NeededNames[];
  readonly allowAnyExpression?: boolean;
}

interface Macros {
  [m: string]: Macro;
  Q: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null }>;
  X: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null, source: t.StringLiteral }>;
  ReturnIfAbrupt: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null }>;
  IfAbruptCloseIterator: Macro<{ value: t.Identifier, iteratorRecord: t.Identifier }>;
  IfAbruptRejectPromise: Macro<{ value: t.Identifier, capability: t.Identifier }>;
}

export default ({ types: t, template }: typeof import('@babel/core')): PluginObj<State> => {
  function createImportCompletion(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { Completion } from "${r}";
    `);
  }

  function createImportSkipDebugger(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { skipDebugger } from "${r}";
    `);
  }

  function createImportAbruptCompletion(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { AbruptCompletion } from "${r}";
    `);
  }

  function createImportAssert(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { Assert } from "${r}";
    `);
  }

  function createImportCall(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { Call } from "${r}";
    `);
  }

  function createImportIteratorClose(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.statement.ast`
      import { IteratorClose } from "${r}";
    `;
  }

  function createImportValue(file: BabelFile) {
    const r = fileToImport(file, IMPORT_PATH);
    return template.ast(`
      import { Value } from "${r}";
    `);
  }

  function addSectionFromComments(path: NodePath<t.FunctionDeclaration> | NodePath<t.VariableDeclaration> | NodePath<t.ExportNamedDeclaration>) {
    if (path.node.leadingComments) {
      for (const c of path.node.leadingComments) {
        let name: string;
        switch (path.type) {
          case 'FunctionDeclaration':
            name = path.node.id!.name;
            break;
          case 'ExportNamedDeclaration':
            name = (path.node.declaration as t.FunctionDeclaration).id!.name;
            break;
          case 'VariableDeclaration':
            name = (path.node.declarations[0].id as t.Identifier).name;
            break;
          default:
            throw (path as NodePath).buildCodeFrameError('Internal error: Unsupported path to addSectionFromComments');
        }
        const lines = c.value.split('\n');
        for (const line of lines) {
          if (/#sec/.test(line)) {
            const section = line.split(' ').find((l) => l.includes('#sec'))!;
            const url = section.includes('https') ? section : `https://tc39.es/ecma262/${section}`;
            path.insertAfter(template.ast(`${name}.section = '${url}';`));
            return;
          }
        }
      }
    }
  }

  const assertYieldStar = template.statement(`
    /* c8 ignore if */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) throw new Assert.Error('Forgot to yield* on the completion.');
  `, { preserveComments: true });

  const maybeSkipDebugger = template.statement(`
    /* c8 ignore if */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) %%value%% = skipDebugger(%%value%%);
  `, { preserveComments: true });

  const MACROS: Partial<Macros> = {
    Q: {
      template: template(`
      /* ReturnIfAbrupt */
      %%checkYieldStar%%
      /* c8 ignore if */ if (%%value%% instanceof AbruptCompletion) return %%value%%;
      /* c8 ignore if */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, { preserveComments: true }),
      imports: ['AbruptCompletion', 'Completion', 'Assert'],
      allowAnyExpression: true,
    },
    X: {
      template: template(`
      /* X */
      %%checkYieldStar%%
      /* c8 ignore if */ if (%%value%% instanceof AbruptCompletion) throw new Assert.Error(%%source%%, { cause: %%value%% });
      /* c8 ignore if */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, { preserveComments: true }),
      imports: ['Assert', 'Completion', 'AbruptCompletion', 'skipDebugger'],
      allowAnyExpression: true,
    },
    IfAbruptCloseIterator: {
      template: template(`
      /* IfAbruptCloseIterator */
      /* c8 ignore if */
      if (%%value%% instanceof AbruptCompletion) return skipDebugger(IteratorClose(%%iteratorRecord%%, %%value%%));
      /* c8 ignore if */
      if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, { preserveComments: true }),
      imports: ['IteratorClose', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    },
    IfAbruptRejectPromise: {
      template: template(`
      /* IfAbruptRejectPromise */
      /* c8 ignore if */
      if (%%value%% instanceof AbruptCompletion) {
        const hygenicTemp2 = skipDebugger(Call(%%capability%%.Reject, Value.undefined, [%%value%%.Value]));
        if (hygenicTemp2 instanceof AbruptCompletion) return hygenicTemp2;
        return %%capability%%.Promise;
      }
      /* c8 ignore if */
      if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, { preserveComments: true }),
      imports: ['Call', 'Value', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    },
  };
  __ts_cast__<Macros>(MACROS);
  MACROS.ReturnIfAbrupt = MACROS.Q;
  const MACRO_NAMES = Object.keys(MACROS);

  function tryRemove(path: NodePath<t.CallExpression>) {
    try {
      path.remove();
    } catch (e) {
      throw path.get('arguments.0').buildCodeFrameError(`Macros error: ${(e as Error).message}`);
    }
  }

  return {
    visitor: {
      Program: {
        enter(_path, state) {
          state.needed = {};
        },
        exit(path, state) {
          if (state.needed.skipDebugger) {
            path.unshiftContainer('body', createImportSkipDebugger(state.file));
          }
          if (state.needed.Completion) {
            path.unshiftContainer('body', createImportCompletion(state.file));
          }
          if (state.needed.AbruptCompletion) {
            path.unshiftContainer('body', createImportAbruptCompletion(state.file));
          }
          if (state.needed.Assert) {
            path.unshiftContainer('body', createImportAssert(state.file));
          }
          if (state.needed.Call) {
            path.unshiftContainer('body', createImportCall(state.file));
          }
          if (state.needed.IteratorClose) {
            path.unshiftContainer('body', createImportIteratorClose(state.file));
          }
          if (state.needed.Value) {
            path.unshiftContainer('body', createImportValue(state.file));
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

          if (macro === MACROS.Q && (path.parentPath.isReturnStatement() || path.parentPath.isArrowFunctionExpression())) {
            path.replaceWith(path.node.arguments[0]);
            return;
          }

          if (path.parentPath.isArrowFunctionExpression()) {
            throw path.buildCodeFrameError('Macros may not be the sole expression of an arrow function');
          }

          const statementPath = findParentStatementPath(path);
          if (!statementPath) {
            throw path.buildCodeFrameError('Internal error: no parent statement found');
          }

          macro.imports.forEach((i) => {
            state.needed[i] = path.scope.getBinding(i) === undefined;
          });

          if (macro === MACROS.Q && t.isIdentifier(argument)) {
            const binding = path.scope.getBinding(argument.name)!;
            (binding.path.parent as t.VariableDeclaration).kind = 'let';
            statementPath.insertBefore(template(`
              /* ReturnIfAbrupt */
              /* c8 ignore if */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) throw new Assert.Error('Forgot to yield* on the completion.');
              /* c8 ignore if */ if (%%value%% instanceof AbruptCompletion) return %%value%%;
              /* c8 ignore if */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
            `, { preserveComments: true })({ value: argument }));
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
              const binding = path.scope.getBinding(argument.name)!;
              (binding.path.parent as t.VariableDeclaration).kind = 'let';
              statementPath.insertBefore(macro.template({ value: argument, capability }));
              tryRemove(path);
            } else if (macro === MACROS.IfAbruptCloseIterator) {
              if (!t.isIdentifier(argument)) {
                throw path.get('arguments.0').buildCodeFrameError('First argument to IfAbruptCloseIterator should be an identifier');
              }
              const iteratorRecord = path.get('arguments.1');
              if (!iteratorRecord.isIdentifier()) {
                throw iteratorRecord.buildCodeFrameError('Second argument to IfAbruptCloseIterator should be an identifier');
              }
              const binding = path.scope.getBinding(argument.name)!;
              (binding.path.parent as t.VariableDeclaration).kind = 'let';
              statementPath.insertBefore(
                macro.template({
                  value: argument,
                  iteratorRecord: iteratorRecord.node,
                }),
              );
              tryRemove(path);
            } else {
              let id;
              if (!macro.allowAnyExpression) {
                if (!t.isIdentifier(argument)) {
                  throw path.get('arguments.0').buildCodeFrameError(`First argument to ${macroName} should be an identifier`);
                }
                id = argument;
              } else {
                id = statementPath.scope.generateUidIdentifier();
                statementPath.insertBefore(template(`
                  /* ${macroName !== 'Q' ? macroName : 'ReturnIfAbrupt'} */
                  let %%id%% = %%argument%%;
                `, { preserveComments: true })({ id, argument }));
              }

              const replacement: { value: typeof id, checkYieldStar: t.Statement | null, source?: t.StringLiteral } = {
                checkYieldStar: null,
                value: id,
              };
              if (macro === MACROS.X) {
                replacement.source = t.stringLiteral(`! ${path.get('arguments.0').getSource()} returned an abrupt completion`);
                if (!t.isYieldExpression(argument, { delegate: true })) {
                  replacement.checkYieldStar = maybeSkipDebugger({ value: id });
                }
              } else if (macro === MACROS.Q) {
                if (!t.isYieldExpression(argument, { delegate: true })) {
                  replacement.checkYieldStar = assertYieldStar({ value: id });
                }
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
        if (t.isThrowStatement(n) && t.isNewExpression(n.argument) && (n.argument.callee as t.Identifier).name === 'OutOfRange') {
          path.addComment('leading', 'c8 ignore next', false);
        }
      },
      FunctionDeclaration(path) {
        addSectionFromComments(path);
      },
      VariableDeclaration(path) {
        if (path.get('declarations.0.init').isArrowFunctionExpression() || path.get('declarations.0.init').isFunctionExpression()) {
          addSectionFromComments(path);
        }
      },
      ExportNamedDeclaration(path) {
        if (path.get('declaration').isFunctionDeclaration()) {
          addSectionFromComments(path);
        }
      },
    },
  };
};
