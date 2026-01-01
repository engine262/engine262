import {
  type NodePath,
  traverse,
  type Node,
  type PluginObj, type PluginPass,
  type types as t,
} from '@babel/core';
import type { PublicReplacements } from '@babel/template';

function __ts_cast__<T>(_value: unknown): asserts _value is T { }

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

type NeededNames = 'Completion' | 'AbruptCompletion' | 'Assert' | 'Call' | 'IteratorClose' | 'AsyncIteratorClose' | 'Value' | 'skipDebugger';

interface State extends PluginPass {
  needed: Partial<Record<NeededNames, boolean>>;
}

interface Macro<R extends PublicReplacements = Record<string, Node | null>> {
  template(sourceLocation: Node, replacements: Readonly<R>): t.Statement | t.Statement[];
  readonly imports: readonly NeededNames[];
  readonly allowAnyExpression?: boolean;
}

interface Macros {
  [m: string]: Macro;
  Q: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null }>;
  X: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null, source: t.StringLiteral }>;
  ReturnIfAbrupt: Macro<{ value: t.Identifier, checkYieldStar: t.Statement | null }>;
  IfAbruptCloseIterator: Macro<{ value: t.Identifier, iteratorRecord: t.Identifier }>;
  IfAbruptCloseAsyncIterator: Macro<{ value: t.Identifier, iteratorRecord: t.Identifier }>;
  IfAbruptRejectPromise: Macro<{ value: t.Identifier, capability: t.Identifier }>;
}

export default ({ types: t, template }: typeof import('@babel/core')): PluginObj<State> => {
  const parseOptions = { preserveComments: true };
  function createImportCompletion() {
    return template.ast(`
      import { Completion } from "#self";
    `);
  }

  function createImportSkipDebugger() {
    return template.ast(`
      import { skipDebugger } from "#self";
    `);
  }

  function createImportAbruptCompletion() {
    return template.ast(`
      import { AbruptCompletion } from "#self";
    `);
  }

  function createImportAssert() {
    return template.ast(`
      import { Assert } from "#self";
    `);
  }

  function createImportCall() {
    return template.ast(`
      import { Call } from "#self";
    `);
  }

  function createImportIteratorClose() {
    return template.statement.ast`
      import { IteratorClose } from "#self";
    `;
  }

  function createImportAsyncIteratorClose() {
    return template.statement.ast`
      import { AsyncIteratorClose } from "#self";
    `;
  }

  function createImportValue() {
    return template.ast(`
      import { Value } from "#self";
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
            const result = path.insertAfter(withSource(c, template.ast(`${name}.section = '${url}';`)));
            if (path.node.trailingComments) {
              result[result.length - 1].node.trailingComments = path.node.trailingComments;
              path.node.trailingComments = null;
            }
            return;
          }
        }
      }
    }
  }


  const maybeSkipDebugger = (value: t.Identifier, callee: Node) => withSource(callee, template.statement(`
      /* node:coverage ignore next */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) %%value%% = skipDebugger(%%value%%);
    `, { preserveComments: true })({ value }))[0];

  type NodeWithLocation = Pick<Node, 'start' | 'end' | 'loc'>;

  function setSource(source: NodeWithLocation, n: t.Node) {
    if (n.loc) {
      return;
    }
    n.start = source.start;
    n.end = source.end;
    n.loc = source.loc;
    n.leadingComments?.forEach((comment) => {
      comment.start = source.start || undefined;
      comment.end = source.end || undefined;
      comment.loc = source.loc || undefined;
    });
  }

  function withSource(source: NodeWithLocation, node: t.Statement | t.Statement[]): t.Statement[] {
    if (!Array.isArray(node)) {
      node = [node];
    }
    for (const n of node) {
      setSource(source, n);
      traverse(n, {
        noScope: true,
        enter(path) {
          setSource(source, path.node);
        },
      });
    }
    return node;
  }

  const MACROS: Macros = {
    Q: {
      template: (source, code) => withSource(source, template(`
      /* ReturnIfAbrupt */
      %%checkYieldStar%%
      /* node:coverage ignore next */ if (%%value%% instanceof AbruptCompletion) return %%value%%;
      /* node:coverage ignore next */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, parseOptions)(code)),
      imports: ['AbruptCompletion', 'Completion', 'Assert'],
      allowAnyExpression: true,
    },
    X: {
      template: (source, code) => withSource(source, template(`
      /* X */
      %%checkYieldStar%%
      /* node:coverage ignore next */ if (%%value%% instanceof AbruptCompletion) throw new Assert.Error(%%source%%, { cause: %%value%% });
      /* node:coverage ignore next */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, parseOptions)(code)),
      imports: ['Assert', 'Completion', 'AbruptCompletion', 'skipDebugger'],
      allowAnyExpression: true,
    },
    IfAbruptCloseIterator: {
      template: (source, code) => withSource(source, template(`
      /* IfAbruptCloseIterator */
      /* node:coverage ignore next */
      if (%%value%% instanceof AbruptCompletion) return skipDebugger(IteratorClose(%%iteratorRecord%%, %%value%%));
      /* node:coverage ignore next */
      if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, parseOptions)(code)),
      imports: ['IteratorClose', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    },
    IfAbruptCloseAsyncIterator: {
      template: (source, code) => withSource(source, template(`
      /* IfAbruptCloseAsyncIterator */
      /* node:coverage ignore next */
      if (%%value%% instanceof AbruptCompletion) return yield* AsyncIteratorClose(%%iteratorRecord%%, %%value%%);
      /* node:coverage ignore next */
      if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      `, parseOptions)(code)),
      imports: ['Assert', 'AsyncIteratorClose', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    },
    IfAbruptRejectPromise: {
      template: (source, code) => withSource(source, template(`
      /* IfAbruptRejectPromise */
      /* node:coverage disable */
      if (%%value%% instanceof AbruptCompletion) {
        const callRejectCompletion = skipDebugger(Call(%%capability%%.Reject, Value.undefined, [%%value%%.Value]));
        if (callRejectCompletion instanceof AbruptCompletion) return callRejectCompletion;
        return %%capability%%.Promise;
      }
      if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
      /* node:coverage enable */
      `, parseOptions)(code)),
      imports: ['Call', 'Value', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    },
    ReturnIfAbrupt: null!,
  };
  __ts_cast__<Macros>(MACROS);
  MACROS.ReturnIfAbrupt = MACROS.Q;
  const MACRO_NAMES = Object.keys(MACROS);

  // For frequently used Record-like classes, inline them to get a better debug experience.
  const Completions = {
    NormalCompletion: (source: Node, code: PublicReplacements) => withSource(source, template('({ __proto__: NormalCompletion.prototype, Value: %%value%% })', parseOptions)(code))[0],
    ThrowCompletion: (source: Node, code: PublicReplacements) => withSource(source, template('({ __proto__: ThrowCompletion.prototype, Value: %%value%% })', parseOptions)(code))[0],
  };
  const Structs = [
    'AsyncGeneratorRequestRecord',
    'ClassElementDefinitionRecord',
    'ClassFieldDefinitionRecord',
    'ClassStaticBlockDefinitionRecord',
    'PrivateElementRecord',
  ];

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
            path.unshiftContainer('body', createImportSkipDebugger());
          }
          if (state.needed.Completion) {
            path.unshiftContainer('body', createImportCompletion());
          }
          if (state.needed.AbruptCompletion) {
            path.unshiftContainer('body', createImportAbruptCompletion());
          }
          if (state.needed.Assert) {
            path.unshiftContainer('body', createImportAssert());
          }
          if (state.needed.Call) {
            path.unshiftContainer('body', createImportCall());
          }
          if (state.needed.IteratorClose) {
            path.unshiftContainer('body', createImportIteratorClose());
          }
          if (state.needed.AsyncIteratorClose) {
            path.unshiftContainer('body', createImportAsyncIteratorClose());
          }
          if (state.needed.Value) {
            path.unshiftContainer('body', createImportValue());
          }
        },
      },
      CallExpression(path, state) {
        const callee = path.node.callee;
        if (!t.isIdentifier(callee)) {
          return;
        }

        if (callee.name && callee.name in Completions) {
          const template = Completions[callee.name as keyof typeof Completions];
          path.replaceWith(template(callee, { value: path.node.arguments[0] }));
          return;
        }

        if (Structs.includes(callee.name) && path.node.arguments.length === 1) {
          const arg0 = path.node.arguments[0];
          if (t.isObjectExpression(arg0)) {
            path.replaceWith(t.objectExpression([
              t.objectProperty(t.identifier('__proto__'), t.memberExpression(t.identifier(callee.name), t.identifier('prototype'))),
              ...arg0.properties,
            ]));
            return;
          }
        }

        const macroName = callee.name;
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
            statementPath.insertBefore(withSource(callee, template(`
              /* ReturnIfAbrupt */
              /* node:coverage ignore next */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) throw new Assert.Error('Forgot to yield* on the completion.');
              /* node:coverage ignore next */ if (%%value%% instanceof AbruptCompletion) return %%value%%;
              /* node:coverage ignore next */ if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
            `, parseOptions)({ value: argument })));
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
              statementPath.insertBefore(macro.template(callee, { value: argument, capability }));
              tryRemove(path);
            } else if (macro === MACROS.IfAbruptCloseIterator || macro === MACROS.IfAbruptCloseAsyncIterator) {
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
                macro.template(callee, {
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
                statementPath.insertBefore(withSource(callee, template(`
                  /* ${macroName !== 'Q' ? macroName : 'ReturnIfAbrupt'} */
                  let %%id%% = %%argument%%;
                `, parseOptions)({ id, argument })));
              }

              const replacement: { value: typeof id, checkYieldStar: t.Statement | null, source?: t.StringLiteral } = {
                checkYieldStar: null,
                value: id,
              };
              if (macro === MACROS.X) {
                replacement.source = t.stringLiteral(`! ${path.get('arguments.0').getSource()} returned an abrupt completion`);
                if (!t.isYieldExpression(argument, { delegate: true })) {
                  replacement.checkYieldStar = maybeSkipDebugger(id, callee);
                }
              }
              statementPath.insertBefore(macro.template(callee, replacement));
              path.replaceWith(id);
            }
          }
        } else if (macroName === 'Assert') {
          if (!path.node.arguments[1]) {
            path.node.arguments.push(t.stringLiteral(path.get('arguments.0').getSource()));
          }
        }
      },
      ThrowStatement(path) {
        const arg = path.get('argument');
        if (arg.isNewExpression()) {
          const callee = arg.get('callee');
          if (callee.isIdentifier() && callee.node.name === 'OutOfRange') {
            path.addComment('leading', ' node:coverage ignore next ', false);

            const { parentPath } = path;
            if (parentPath.isSwitchCase() && parentPath.node.consequent[0] === path.node) {
              parentPath.addComment('leading', ' node:coverage ignore next ', false);
            }
          }
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
