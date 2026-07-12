// @ts-nocheck
import {
  type NodePath,
  traverse,
  template,
  type PluginObject, type PluginPass,
  types as t,
} from '@babel/core';
import { analyzeQMacroTransformations } from './q-macro-analysis.mjs';

const Completions = {
  NormalCompletion(source: NodeWithLocation, code: { value: t.Expression }) {
    return withSource(source, template('({ __proto__: NormalCompletion.prototype, Value: %%value%% })', parseOptions)(code))[0];
  },
  ThrowCompletion(source: NodeWithLocation, code: { value: t.Expression }) {
    return withSource(source, template('({ __proto__: ThrowCompletion.prototype, Value: %%value%% })', parseOptions)(code))[0];
  },
};

const Macros = {
  Assert: {
    template: (source: NodeWithLocation, code: { test: t.Expression, testStr: t.Expression }) => withSource(source, template(`
    /* Assert */ /* node:coverage ignore next */ if (!(%%test%%)) throw new Assert.Error(%%testStr%%);
    `, parseOptions)(code))[0],
    imports: [],
    allowAnyExpression: true,
    expressionOnlyUsedOnce: true,
  },
  ReturnIfAbrupt: {
    template: (source: NodeWithLocation, code: { value: t.Expression }) => withSource(source, template(`
    /* ReturnIfAbrupt */
    if (%%value%% instanceof Completion) {
      if (%%value%% instanceof AbruptCompletion) return %%value%%;
      %%value%% = %%value%%.Value;
    }
    `, parseOptions)(code)),
    imports: ['AbruptCompletion', 'Completion', 'Assert'],
    allowAnyExpression: true,
    expressionOnlyUsedOnce: false,
  },
  X: {
    template: (source: NodeWithLocation, code: { value: t.Expression, checkYieldStar: t.Statement | null, source: t.Expression }) => withSource(source, template(`
    /* X */
    %%checkYieldStar%%
    /* node:coverage ignore next */ if (%%value%% instanceof Completion) {
      /* node:coverage ignore next */ if (%%value%% instanceof AbruptCompletion) throw new Assert.Error(%%source%%, { cause: %%value%% });
      %%value%% = %%value%%.Value;
    }
    `, parseOptions)(code)),
    imports: ['Assert', 'Completion', 'AbruptCompletion', 'skipDebugger'],
    allowAnyExpression: true,
    expressionOnlyUsedOnce: false,
  },
  IfAbruptCloseIterator: {
    template: (source: NodeWithLocation, code: { value: t.Expression, iteratorRecord: t.Expression }) => withSource(source, template(`
    /* IfAbruptCloseIterator */
    /* node:coverage ignore next */
    if (%%value%% instanceof AbruptCompletion) return skipDebugger(IteratorClose(%%iteratorRecord%%, %%value%%));
    /* node:coverage ignore next */
    if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
    `, parseOptions)(code)),
    imports: ['IteratorClose', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    allowAnyExpression: false,
    expressionOnlyUsedOnce: false,
  },
  IfAbruptCloseIterators: {
    template: (source: NodeWithLocation, code: { value: t.Expression, iteratorRecord: t.Expression }) => withSource(source, template(`
    /* IfAbruptCloseIterators */
    /* node:coverage ignore next */
    if (%%value%% instanceof AbruptCompletion) return yield* IteratorCloseAll(%%iteratorRecord%%, %%value%%);
    /* node:coverage ignore next */
    if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
    `, parseOptions)(code)),
    imports: ['IteratorCloseAll', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    allowAnyExpression: false,
    expressionOnlyUsedOnce: false,
  },
  IfAbruptCloseAsyncIterator: {
    template: (source: NodeWithLocation, code: { value: t.Expression, iteratorRecord: t.Expression }) => withSource(source, template(`
    /* IfAbruptCloseAsyncIterator */
    /* node:coverage ignore next */
    if (%%value%% instanceof AbruptCompletion) return yield* AsyncIteratorClose(%%iteratorRecord%%, %%value%%);
    /* node:coverage ignore next */
    if (%%value%% instanceof Completion) %%value%% = %%value%%.Value;
    `, parseOptions)(code)),
    imports: ['Assert', 'AsyncIteratorClose', 'AbruptCompletion', 'Completion', 'skipDebugger'],
    allowAnyExpression: false,
    expressionOnlyUsedOnce: false,
  },
  IfAbruptRejectPromise: {
    template: (source: NodeWithLocation, code: { value: t.Expression, capability: t.Expression }) => withSource(source, template(`
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
    allowAnyExpression: false,
    expressionOnlyUsedOnce: false,
  },
  Throw: {
    template: (source: NodeWithLocation, code: { value: t.Expression }) => withSource(source, template(`
    /* Throw */ return ThrowCompletion(%%value%%);
    `, parseOptions)(code)),
    imports: ['ThrowCompletion'],
    allowAnyExpression: true,
    expressionOnlyUsedOnce: true,
  },
} satisfies Record<string, {
  template: (source: NodeWithLocation, code: never) => t.Statement | t.Statement[],
  imports: NeededNames[],
  allowAnyExpression: boolean,
  expressionOnlyUsedOnce: boolean,
}>;

const parseOptions = { preserveComments: true };
const specLinkPattern = /https:\/\/tc39\.es\/[^\s#]+#[^\s]+|#sec-[^\s]+/;

type NeededNames = 'Completion' | 'AbruptCompletion' | 'Assert' | 'Call' | 'IteratorClose' | 'IteratorCloseAll' | 'AsyncIteratorClose' | 'Value' | 'skipDebugger' | 'ThrowCompletion';

export interface TransformOptions {
  readonly internals?: string;
}

export default ({ internals = '@engine262/engine262' }: TransformOptions = {}): PluginObject => ({
  visitor: {
    Program: {
      enter(_path, state) {
        state.needed = Object.create(null);
        state.overloadSpecComments = collectOverloadSpecComments(_path);
        state.valueLiteralConstructors = Object.create(null);
        const macroAnalysis = analyzeQMacroTransformations(_path.node, t.VISITOR_KEYS);
        state.qMacroPlans = new Set(
          macroAnalysis.plans.map(({ start, end }) => `${start}:${end}`),
        );
        state.qMacroDiagnostics = new Map(
          macroAnalysis.diagnostics.map((diagnostic) => [
            `${diagnostic.start}:${diagnostic.end}`,
            diagnostic.message,
          ]),
        );
      },
      exit(path, state) {
        const imports: string[] = [];
        Object.entries(state.needed).forEach(([key, value]) => {
          if (value)imports.push(key);
        });
        if (imports.length) {
          path.unshiftContainer('body', template.ast(`
            import { ${imports.join(',')} } from "${internals}";
          `));
        }
        for (const [constructor, binding] of Object.entries(state.valueLiteralConstructors)) {
          if (binding.needsImport) addNamedImport(path, internals, constructor, binding.local);
        }
        path.scope.crawl();
        const transformedMacros = new Set([
          'Assert',
          'Q',
          'X',
          'IfAbruptCloseIterator',
          'IfAbruptCloseIterators',
          'IfAbruptCloseAsyncIterator',
          'IfAbruptRejectPromise',
          'Throw',
        ]);
        for (const statement of path.get('body')) {
          if (!statement.isImportDeclaration()) continue;
          for (const specifier of statement.get('specifiers')) {
            if (!specifier.isImportSpecifier() || !transformedMacros.has(specifier.node.local.name)) continue;
            if (!path.scope.getBinding(specifier.node.local.name)?.referenced) specifier.remove();
          }
          if (statement.node.specifiers.length === 0) statement.remove();
        }
      },
    },
    CallExpression(path, state) {
      if (transformRecordCreation(path, state)) return;
      if (transformValueLiteralCreation(path, state)) return;
      const callee = path.node.callee;
      if (!t.isIdentifier(callee)) return;
      const argument = path.node.arguments[0];

      // Completion optimization
      if (callee.name && callee.name in Completions) {
        const template = Completions[callee.name as keyof typeof Completions];
        if (!t.isExpression(argument)) {
          throw path.get('arguments.0').buildCodeFrameError('First argument to completion macros must be an expression');
        }
        path.replaceWith(template(callee, { value: argument }));
        return;
      }

      const macroName = (callee.name === 'Q' ? 'ReturnIfAbrupt' : callee.name) as keyof typeof Macros;
      if (!(macroName in Macros)) return;
      const macroKey = `${path.node.start}:${path.node.end}`;
      const diagnostic = state.qMacroDiagnostics.get(macroKey);
      if (diagnostic) throw path.buildCodeFrameError(diagnostic);
      if (!state.qMacroPlans.has(macroKey)) return;
      if (!t.isExpression(argument)) {
        throw path.get('arguments.0').buildCodeFrameError('First argument to macros must be an expression');
      }

      if (macroName === 'Assert') {
        let arg1 = path.node.arguments[1];
        if (!arg1 || !t.isExpression(arg1)) {
          arg1 = t.stringLiteral(path.get('arguments.0').getSource());
          path.node.arguments.push(arg1);
        }
        if (path.parentPath.isExpressionStatement()) {
          path.parentPath.replaceWith(Macros.Assert.template(callee, { test: argument, testStr: arg1 }));
        }
        return;
      }

      if (withinNotTransformablePosition(path)) {
        throw path.buildCodeFrameError('Macros may not be used within the test of if statements, while statements, for statements, or switch statements');
      }

      const enclosingConditional = getEnclosingConditionalExpression(path);
      if (enclosingConditional !== null) {
        if (enclosingConditional.parentPath.isVariableDeclarator()) {
          const declaration = enclosingConditional.parentPath.parentPath;
          const id = enclosingConditional.parentPath.get('id');
          declaration.replaceWithMultiple([
            template.ast(`let ${id};`) as t.VariableDeclaration,
            t.ifStatement(
              enclosingConditional.get('test').node,
              t.blockStatement([t.expressionStatement(t.assignmentExpression('=', id.node as t.Identifier, enclosingConditional.get('consequent').node))]),
              t.blockStatement([t.expressionStatement(t.assignmentExpression('=', id.node as t.Identifier, enclosingConditional.get('alternate').node))]),
            ),
          ]);
          return;
        } else {
          throw path.buildCodeFrameError('Macros may not be used within conditional expressions');
        }
      }

      if (macroName === 'ReturnIfAbrupt' && (path.parentPath.isReturnStatement() || path.parentPath.isArrowFunctionExpression())) {
        path.replaceWith(path.node.arguments[0]);
        return;
      }

      Macros[macroName].imports.forEach((i) => {
        state.needed[i] = path.scope.getBinding(i) === undefined;
      });

      if (macroName === 'Throw' && (path.parentPath.isReturnStatement() || path.parentPath.isArrowFunctionExpression())) {
        path.replaceWith(Completions.ThrowCompletion(callee, { value: argument }));
        return;
      }

      if (path.parentPath.isArrowFunctionExpression()) {
        throw path.buildCodeFrameError('Macros may not be the sole expression of an arrow function');
      }

      const statementPath = path.findParent((p) => p.isStatement());
      if (!statementPath) {
        throw path.buildCodeFrameError('Internal error: no parent statement found');
      }

      if ((macroName === 'ReturnIfAbrupt' || macroName === 'X') && t.isIdentifier(argument)) {
        const binding = path.scope.getBinding(argument.name)!;
        (binding.path.parent as t.VariableDeclaration).kind = 'let';
        statementPath.insertBefore(Macros.ReturnIfAbrupt.template(callee, { value: argument }));
        if (path.parentPath.isExpressionStatement()) {
          removePath(path);
        } else {
          path.replaceWith(argument);
        }
      } else if (macroName === 'IfAbruptRejectPromise') {
        const [, capability] = path.node.arguments;
        if (!t.isIdentifier(argument)) {
          throw path.get('arguments.0').buildCodeFrameError('First argument to IfAbruptRejectPromise should be an identifier');
        }
        if (!t.isIdentifier(capability)) {
          throw path.get('arguments.1').buildCodeFrameError('Second argument to IfAbruptRejectPromise should be an identifier');
        }
        const binding = path.scope.getBinding(argument.name)!;
        (binding.path.parent as t.VariableDeclaration).kind = 'let';
        statementPath.insertBefore(Macros.IfAbruptRejectPromise.template(callee, { value: argument, capability }));
        removePath(path);
      } else if (macroName === 'IfAbruptCloseIterator' || macroName === 'IfAbruptCloseIterators' || macroName === 'IfAbruptCloseAsyncIterator') {
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
          Macros[macroName].template(callee, {
            value: argument,
            iteratorRecord: iteratorRecord.node,
          }),
        );
        removePath(path);
      } else {
        let sideEffect: t.Statement[] = [];
        let id;
        const macro = Macros[macroName];
        if (t.isIdentifier(argument)) {
          id = argument;
        } else if (macro.allowAnyExpression) {
          if (macro.expressionOnlyUsedOnce) {
            id = argument;
          } else {
            // find a better name for cases like `const x = Q(y)`, reusing `x` instead of generating `_temp1`
            const possibleAssign = path.findParent((p) => p.isVariableDeclarator() && t.isIdentifier(p.node.id)) as NodePath<t.VariableDeclarator> | null;
            id = path.scope.generateUidIdentifier((possibleAssign?.node.id as t.Identifier | undefined)?.name);
            sideEffect = withSource(callee, template(`
              /* ${macroName} */
              let %%id%% = %%argument%%;
            `, parseOptions)({ id, argument }));
          }
        } else {
          throw path.get('arguments.0').buildCodeFrameError(`First argument to ${macroName} should be an identifier`);
        }

        let result: t.Statement[];
        switch (macroName) {
          case 'ReturnIfAbrupt': {
            if (t.isIdentifier(argument)) {
              const binding = path.scope.getBinding(argument.name)!;
              (binding.path.parent as t.VariableDeclaration).kind = 'let';
            }
            result = Macros.ReturnIfAbrupt.template(callee, { value: id });
            break;
          }
          case 'X': {
            if (t.isIdentifier(argument)) {
              const binding = path.scope.getBinding(argument.name)!;
              (binding.path.parent as t.VariableDeclaration).kind = 'let';
            }
            const source = t.stringLiteral(`! ${path.get('arguments.0').getSource()} returned an abrupt completion`);
            const checkYieldStar = t.isYieldExpression(argument, { delegate: true }) ? null : skipDebugger(id as t.Identifier, callee);
            result = Macros.X.template(callee, { value: id, checkYieldStar, source });
            break;
          }
          case 'Throw':
            if (!t.isExpression(argument)) {
              throw path.get('arguments.0').buildCodeFrameError('Argument to Throw should be an expression');
            }
            result = Macros.Throw.template(callee, { value: argument });
            break;
          default:
            ((_: never): never => {
              throw path.buildCodeFrameError(`Internal error: no template found for macro ${_}`);
            })(macroName);
        }
        if (statementPath.parentPath?.isIfStatement() && !statementPath.isBlock()) {
          statementPath.replaceWith(t.blockStatement([
            ...sideEffect!, ...result, statementPath.node as t.Statement,
          ].filter(Boolean)));
        } else {
          if (sideEffect.length) statementPath.insertBefore(sideEffect);
          statementPath.insertBefore(result);
        }
        if (path.parentPath.isExpressionStatement()) {
          removePath(path);
        } else {
          path.replaceWith(id);
        }
      }
    },
    NewExpression(path, state) {
      transformRecordCreation(path, state);
    },
    ThrowStatement(path) {
      const arg = path.get('argument');
      const callee = arg.get('callee');
      if (callee.isMemberExpression() && callee.node.object.type === 'Identifier' && callee.node.object.name === 'OutOfRange') {
        path.addComment('leading', ' node:coverage ignore next ', false);

        const { parentPath } = path;
        if (parentPath.isSwitchCase() && parentPath.node.consequent[0] === path.node) {
          parentPath.addComment('leading', ' node:coverage ignore next ', false);
        }
      }
    },
    FunctionDeclaration(path, state) {
      if (path.parentPath?.isExportNamedDeclaration()) return;
      addSectionFromComments(path, state.overloadSpecComments);
    },
    VariableDeclaration(path, state) {
      if (path.get('declarations.0.init').isArrowFunctionExpression() || path.get('declarations.0.init').isFunctionExpression()) {
        addSectionFromComments(path, state.overloadSpecComments);
      }
    },
    ExportNamedDeclaration(path, state) {
      const declaration = path.get('declaration');
      if (
        declaration.isFunctionDeclaration()
        || (declaration.isVariableDeclaration()
          && (declaration.get('declarations.0.init').isArrowFunctionExpression()
            || declaration.get('declarations.0.init').isFunctionExpression()))
      ) {
        addSectionFromComments(path, state.overloadSpecComments);
      }
    },
  },
});

function transformRecordCreation(
  path: NodePath<t.CallExpression | t.NewExpression>,
  state: PluginPass & { recordCreations?: Set<string> },
): boolean {
  const { start, end } = path.node;
  if (
    start === null
    || start === undefined
    || end === null
    || end === undefined
    || !state.recordCreations?.has(`${start}:${end}`)
  ) return false;
  const [argument] = path.node.arguments;
  if (!t.isObjectExpression(argument) || !t.isExpression(path.node.callee)) return false;
  path.replaceWith(t.objectExpression([
    t.objectProperty(
      t.identifier('__proto__'),
      t.memberExpression(t.cloneNode(path.node.callee), t.identifier('prototype')),
    ),
    ...argument.properties,
  ]));
  return true;
}

function transformValueLiteralCreation(
  path: NodePath<t.CallExpression>,
  state: PluginPass & {
    valueLiteralCreations?: Map<string, { constructor: string; localConstructor: boolean }>;
    valueLiteralConstructors?: Record<string, { local: string; needsImport: boolean }>;
  },
): boolean {
  const { start, end } = path.node;
  if (start === null || start === undefined || end === null || end === undefined) return false;
  const plan = state.valueLiteralCreations?.get(`${start}:${end}`);
  const [argument] = path.node.arguments;
  if (!plan || !t.isExpression(argument)) return false;
  const classIdentifier = valueLiteralConstructorIdentifier(
    path,
    state,
    plan.constructor,
    plan.localConstructor,
  );
  path.replaceWith(t.objectExpression([
    t.objectProperty(
      t.identifier('__proto__'),
      t.memberExpression(t.identifier(classIdentifier), t.identifier('prototype')),
    ),
    t.objectProperty(t.identifier('value'), argument),
  ]));
  return true;
}

function valueLiteralConstructorIdentifier(
  path: NodePath<t.CallExpression>,
  state: PluginPass & {
    valueLiteralConstructors?: Record<string, { local: string; needsImport: boolean }>;
  },
  constructor: string,
  localConstructor: boolean,
): string {
  const existing = state.valueLiteralConstructors?.[constructor];
  if (existing) return existing.local;
  const program = path.findParent((parent) => parent.isProgram()) as NodePath<t.Program>;
  if (localConstructor && program.scope.hasBinding(constructor)) {
    state.valueLiteralConstructors[constructor] = { local: constructor, needsImport: false };
    return constructor;
  }
  for (const statement of program.get('body')) {
    if (!statement.isImportDeclaration()) continue;
    for (const specifier of statement.get('specifiers')) {
      if (
        specifier.isImportSpecifier()
        && statement.node.importKind !== 'type'
        && specifier.node.importKind !== 'type'
        && t.isIdentifier(specifier.node.imported, { name: constructor })
      ) {
        state.valueLiteralConstructors[constructor] = {
          local: specifier.node.local.name,
          needsImport: false,
        };
        return specifier.node.local.name;
      }
    }
  }
  const local = program.scope.hasBinding(constructor)
    ? program.scope.generateUidIdentifier(constructor).name
    : constructor;
  state.valueLiteralConstructors[constructor] = { local, needsImport: true };
  return local;
}

function addNamedImport(
  program: NodePath<t.Program>,
  source: string,
  imported: string,
  local: string,
): void {
  const specifier = t.importSpecifier(t.identifier(local), t.identifier(imported));
  for (const statement of program.get('body')) {
    if (
      statement.isImportDeclaration()
      && statement.node.source.value === source
      && statement.node.importKind !== 'type'
    ) {
      statement.node.specifiers.push(specifier);
      return;
    }
  }
  program.unshiftContainer('body', t.importDeclaration([specifier], t.stringLiteral(source)));
}

function addSectionFromComments(
  path: NodePath<t.FunctionDeclaration> | NodePath<t.VariableDeclaration> | NodePath<t.ExportNamedDeclaration>,
  overloadSpecComments?: Map<string, t.Comment[]>,
) {
  const comments = specComments(path, overloadSpecComments);
  if (comments) {
    for (const c of comments) {
      let name: string;
      switch (path.type) {
        case 'FunctionDeclaration':
          name = path.node.id!.name;
          break;
        case 'ExportNamedDeclaration': {
          const declaration = path.node.declaration!;
          if (t.isFunctionDeclaration(declaration)) {
            name = declaration.id!.name;
          } else if (t.isVariableDeclaration(declaration)) {
            name = (declaration.declarations[0].id as t.Identifier).name;
          } else {
            throw path.buildCodeFrameError('Internal error: Unsupported export declaration to addSectionFromComments');
          }
          break;
        }
        case 'VariableDeclaration':
          name = (path.node.declarations[0].id as t.Identifier).name;
          break;
        default:
          throw (path as NodePath).buildCodeFrameError('Internal error: Unsupported path to addSectionFromComments');
      }
      const lines = c.value.split('\n');
      for (const line of lines) {
        const section = line.match(specLinkPattern)?.[0];
        if (section) {
          const url = section.includes('https') ? section : `https://tc39.es/ecma262/${section}`;
          const specName = name
            .replace('Proto_', '#')
            .replace(/(Constructor|_getter|_setter|Getter|Setter)$/, '')
            .replaceAll(/([a-zA-Z])_([a-zA-Z])/g, '$1.$2');
          const result = path.insertAfter(withSource(c, template.ast(`
            ${name}.section = '${url}';
            ${name}.specName = '${specName}';
          `)));
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

function enclosingSpecFunction(
  path: NodePath<t.CallExpression>,
  overloadSpecComments?: Map<string, t.Comment[]>,
): t.Expression | null {
  let parent = path.parentPath;
  while (parent) {
    if (parent.isFunctionDeclaration()) {
      const annotatedPath = parent.parentPath?.isExportNamedDeclaration()
        ? parent.parentPath
        : parent;
      return hasSpecLink(annotatedPath, overloadSpecComments) ? t.identifier(parent.node.id!.name) : null;
    }
    if (parent.isFunctionExpression() || parent.isArrowFunctionExpression()) {
      const declaration = parent.parentPath;
      if (!declaration?.isVariableDeclarator() || !t.isIdentifier(declaration.node.id)) return null;
      const variableDeclaration = declaration.parentPath!;
      const annotatedPath = variableDeclaration.parentPath?.isExportNamedDeclaration()
        ? variableDeclaration.parentPath
        : variableDeclaration;
      return hasSpecLink(annotatedPath) ? t.identifier(declaration.node.id.name) : null;
    }
    if (parent.isClassMethod()) {
      if (!hasSpecLink(parent) || (!t.isIdentifier(parent.node.key) && !t.isStringLiteral(parent.node.key))) return null;
      const classBody = parent.parentPath;
      const classPath = classBody?.parentPath;
      if (!classBody?.isClassBody() || !classPath?.isClassDeclaration() || !classPath.node.id) return null;
      const methodIndex = classBody.node.body.indexOf(parent.node);
      if (!t.isStaticBlock(classBody.node.body[methodIndex + 1])) return null;
      const receiver = parent.node.static
        ? t.identifier(classPath.node.id.name)
        : t.memberExpression(t.identifier(classPath.node.id.name), t.identifier('prototype'));
      return t.memberExpression(
        receiver,
        parent.node.key,
        t.isStringLiteral(parent.node.key),
      );
    }
    if (parent.isObjectMethod()) {
      if (!hasSpecLink(parent)) return null;
      if (t.isIdentifier(parent.node.key)) return t.stringLiteral(parent.node.key.name);
      if (t.isStringLiteral(parent.node.key)) return t.stringLiteral(parent.node.key.value);
      return null;
    }
    parent = parent.parentPath;
  }
  return null;
}

function hasSpecLink(path: NodePath, overloadSpecComments?: Map<string, t.Comment[]>): boolean {
  return specComments(path, overloadSpecComments)?.some((comment) => specLinkPattern.test(comment.value)) === true;
}

function specComments(
  path: NodePath,
  overloadSpecComments?: Map<string, t.Comment[]>,
): t.Comment[] | undefined {
  const direct = path.node.leadingComments;
  if (direct?.some((comment) => specLinkPattern.test(comment.value))) return direct;

  let declaration = path;
  let statement = path;
  if (path.isExportNamedDeclaration()) {
    declaration = path.get('declaration') as NodePath;
  } else if (path.isFunctionDeclaration() && path.parentPath?.isExportNamedDeclaration()) {
    statement = path.parentPath;
  }
  if (!declaration.isFunctionDeclaration() || !declaration.node.id) return direct;

  const name = declaration.node.id.name;
  const recorded = overloadSpecComments?.get(name);
  if (recorded) return recorded;
  let sibling = statement.getPrevSibling();
  while (sibling.node) {
    const siblingDeclaration = sibling.isExportNamedDeclaration()
      ? sibling.get('declaration') as NodePath
      : sibling;
    if (
      !(siblingDeclaration.isTSDeclareFunction() || siblingDeclaration.isFunctionDeclaration())
      || siblingDeclaration.node.id?.name !== name
      || siblingDeclaration.node.body
    ) break;
    const comments = [
      ...(sibling.node.leadingComments ?? []),
      ...(siblingDeclaration.node.leadingComments ?? []),
    ];
    if (comments.some((comment) => specLinkPattern.test(comment.value))) return comments;
    sibling = sibling.getPrevSibling();
  }
  return direct;
}

function collectOverloadSpecComments(path: NodePath<t.Program>): Map<string, t.Comment[]> {
  const result = new Map<string, t.Comment[]>();
  for (const statement of path.get('body')) {
    const declaration = statement.isExportNamedDeclaration()
      ? statement.get('declaration') as NodePath
      : statement;
    if (
      !(declaration.isTSDeclareFunction() || declaration.isFunctionDeclaration())
      || declaration.node.body
      || !declaration.node.id
    ) continue;
    const comments = [
      ...(statement.node.leadingComments ?? []),
      ...(declaration.node.leadingComments ?? []),
    ];
    if (comments.some((comment) => specLinkPattern.test(comment.value))) {
      result.set(declaration.node.id.name, comments);
    }
  }
  return result;
}

function skipDebugger(value: t.Identifier, callee: Node) {
  return withSource(callee, template.statement(`
    /* node:coverage ignore next */ if (%%value%% && typeof %%value%% === 'object' && 'next' in %%value%%) %%value%% = skipDebugger(%%value%%);
  `, { preserveComments: true })({ value }))[0];
}

function removePath(path: NodePath<t.CallExpression>) {
  try {
    path.remove();
  } catch (e) {
    throw path.get('arguments.0').buildCodeFrameError(`Macros error: ${(e as Error).message}`);
  }
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

/**
 * We cannot transform for the following cases:
 *
 * while (Q(...))
 * switch (Q(...)) { case Q(...): }
 * for (; Q(...);) { }
 *
 * For if (...), we can do this: if (Q(...)), but not this: if (x && Q(...)) {}
 */
function withinNotTransformablePosition(path: NodePath) {
  const paths = [path.node];
  while (path) {
    const parent = path.parentPath;
    if (!parent) return false;
    if (parent.isWhileStatement() || parent.isForStatement()) {
      if (parent.node.test === path.node) return true;
      if (parent.node.body === path.node) return false;
    }
    if (parent.isIfStatement()) {
      if (parent.node.consequent === path.node || parent.node.alternate === path.node) return false;
      if (parent.node.test.type === 'BinaryExpression' && paths.includes(parent.node.test.right)) {
        return true;
      }
    }
    paths.push(parent.node);
    path = parent;
  }
  return false;
}

type NodeWithLocation = Pick<t.Node, 'start' | 'end' | 'loc'>;
/** Attach source map information to map generated nodes (node) to original node (source) */
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

/** Attach source map information to map generated node (n) to original node (source) */
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
