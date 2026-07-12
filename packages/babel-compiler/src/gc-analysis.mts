import path from 'node:path';
import ts from 'typescript';
import { isGCRelevant, type GCTypeOptions } from './gc-types.mjs';

export interface GCAnalysisOptions extends GCTypeOptions {
  readonly program: ts.Program;
  readonly includeFunctionsWithFrames?: boolean;
}

export interface FramePlanningOptions {
  readonly respectExistingFrames?: boolean;
}

/** Describes one source edit that inserts a GC frame before a suspension. */
export interface FrameInsertionPlan {
  readonly functionStart: number;
  readonly functionEnd: number;
  readonly yield: {
    readonly start: number;
    readonly end: number;
  };
  readonly insertion: {
    readonly mode: 'before' | 'after';
    readonly start: number;
    readonly end: number;
  };
  readonly names: readonly string[];
  readonly frameName: string;
  readonly displayName: string;
}

export interface FramePlanningDiagnostic {
  readonly functionStart: number;
  readonly yield: {
    readonly start: number;
    readonly end: number;
  };
  readonly names: readonly string[];
  readonly message: string;
}

export interface FramePlanningResult {
  readonly plans: readonly FrameInsertionPlan[];
  readonly diagnostics: readonly FramePlanningDiagnostic[];
}

export interface EvaluatorBindingLifetime {
  readonly binding: ts.Identifier;
  readonly declaredAt: number;
  readonly insertion?: FrameInsertion;
}

/** Holds symbol-resolved liveness facts independently of Babel or ESLint ASTs. */
export interface EvaluatorDataFlow {
  readonly function: ts.FunctionLikeDeclaration;
  readonly yields: readonly ts.YieldExpression[];
  readonly bindings: ReadonlyMap<ts.Symbol, EvaluatorBindingLifetime>;
  readonly uses: ReadonlyMap<ts.Symbol, readonly number[]>;
  readonly useNodes: ReadonlyMap<ts.Symbol, ts.Identifier>;
  readonly existingFrames: readonly ts.CallExpression[];
  readonly existingFrameSymbols: ReadonlySet<ts.Symbol>;
}

export class GCTransformError extends Error {
  constructor(message: string, readonly position: number) {
    super(message);
    this.name = 'GCTransformError';
  }
}

export function analyzeEvaluatorFrames(
  fileName: string,
  options: GCAnalysisOptions & FramePlanningOptions,
): readonly FrameInsertionPlan[] {
  const result = planEvaluatorFrames(analyzeEvaluatorDataFlow(fileName, options), options);
  const diagnostic = result.diagnostics[0];
  if (diagnostic) throw new GCTransformError(diagnostic.message, diagnostic.yield.start);
  return result.plans;
}

/** Collects bindings, identifier uses, suspensions, and lexical frame state. */
export function analyzeEvaluatorDataFlow(
  fileName: string,
  options: GCAnalysisOptions,
): readonly EvaluatorDataFlow[] {
  const sourceFile = findSourceFile(options.program, fileName);
  if (!sourceFile) {
    throw new Error(`@engine262/babel-compiler: ${fileName} is not part of the supplied TypeScript Program`);
  }
  const checker = options.program.getTypeChecker();
  const flows: EvaluatorDataFlow[] = [];
  const visit = (node: ts.Node) => {
    if (isFunctionLikeDeclaration(node)) {
      const flow = analyzeFunction(node, checker, options);
      if (flow) flows.push(flow);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return flows.sort((a, b) => a.function.getStart() - b.function.getStart());
}

function analyzeFunction(
  fn: ts.FunctionLikeDeclaration,
  checker: ts.TypeChecker,
  options: GCAnalysisOptions,
): EvaluatorDataFlow | undefined {
  if (!fn.asteriskToken || !fn.body || !ts.isBlock(fn.body)) return undefined;

  const yields: ts.YieldExpression[] = [];
  const bindings = new Map<ts.Symbol, EvaluatorBindingLifetime>();
  const uses = new Map<ts.Symbol, number[]>();
  const useNodes = new Map<ts.Symbol, ts.Identifier>();
  const existingFrames: ts.CallExpression[] = [];
  const existingFrameSymbols = new Set<ts.Symbol>();
  const addBinding = (name: ts.BindingName, declaredAt: number) => {
    if (ts.isIdentifier(name)) {
      const symbol = checker.getSymbolAtLocation(name);
      if (symbol && isGCRelevant(checker.getTypeAtLocation(name), checker, options)) {
        bindings.set(symbol, { binding: name, declaredAt });
      }
      return;
    }
    name.elements.forEach((element) => {
      if (!ts.isOmittedExpression(element)) addBinding(element.name, declaredAt);
    });
  };
  fn.parameters.forEach((parameter) => addBinding(parameter.name, fn.body!.getStart()));

  const addUse = (symbol: ts.Symbol, node: ts.Identifier, position = node.getStart()) => {
    useNodes.set(symbol, node);
    const positions = uses.get(symbol);
    if (positions) positions.push(position);
    else uses.set(symbol, [position]);
  };
  const collectNestedFunctionUses = (nestedFn: ts.FunctionLikeDeclaration) => {
    const visitNested = (node: ts.Node) => {
      if (ts.isIdentifier(node) && isIdentifierReference(node)) {
        const symbol = checker.getSymbolAtLocation(node);
        const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
        if (symbol && declaration && !isAncestor(nestedFn, declaration)) {
          // A nested closure can retain this binding past any suspension in its
          // enclosing evaluator, irrespective of the closure's source position.
          addUse(symbol, node, fn.body!.getEnd());
        }
      }
      ts.forEachChild(node, visitNested);
    };
    visitNested(nestedFn.body!);
  };
  const visit = (node: ts.Node) => {
    if (node !== fn.body && isFunctionLikeDeclaration(node)) {
      if (node.body) collectNestedFunctionUses(node);
      return;
    }
    if (ts.isYieldExpression(node)) yields.push(node);
    if (ts.isVariableDeclaration(node)) addBinding(node.name, node.getEnd());
    if (isCaptureEvaluatorFrameCall(node)) {
      existingFrames.push(node);
      for (const symbol of referencedSymbols(node.arguments[0], checker)) existingFrameSymbols.add(symbol);
      return;
    }
    if (ts.isIdentifier(node) && isIdentifierReference(node)) {
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol) addUse(symbol, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  if (
    yields.length === 0
    || (!isEvaluator(fn, checker) && !(options.includeFunctionsWithFrames && existingFrames.length > 0))
  ) return undefined;

  const closureInsertion = blockStartInsertion(fn.body);
  for (const [symbol, identifier] of useNodes) {
    if (
      bindings.has(symbol)
      || !closureInsertion
      || symbol.name === 'surroundingAgent'
      || !isGCRelevant(checker.getTypeAtLocation(identifier), checker, options)
      || !isBindingFromEnclosingFunction(symbol, fn)
    ) continue;
    bindings.set(symbol, {
      binding: identifier,
      declaredAt: fn.body.getStart(),
      insertion: closureInsertion,
    });
  }

  return {
    function: fn,
    yields,
    bindings,
    uses,
    useNodes,
    existingFrames,
    existingFrameSymbols,
  };
}

/** Converts evaluator data flow into source-range insertion plans and diagnostics. */
export function planEvaluatorFrames(
  flows: readonly EvaluatorDataFlow[],
  options: FramePlanningOptions = {},
): FramePlanningResult {
  const plans: FrameInsertionPlan[] = [];
  const diagnostics: FramePlanningDiagnostic[] = [];
  for (const flow of flows) planEvaluatorFunctionFrames(flow, options, plans, diagnostics);
  return {
    plans: plans.sort((a, b) => a.insertion.start - b.insertion.start),
    diagnostics: diagnostics.sort((a, b) => a.yield.start - b.yield.start),
  };
}

function planEvaluatorFunctionFrames(
  flow: EvaluatorDataFlow,
  options: FramePlanningOptions,
  plans: FrameInsertionPlan[],
  diagnostics: FramePlanningDiagnostic[],
): void {
  const fn = flow.function;
  const groups = new Map<string, {
    insertion: FrameInsertion;
    names: Set<string>;
    yield: ts.YieldExpression;
  }>();
  for (const [symbol, lifetime] of flow.bindings) {
    if (options.respectExistingFrames && flow.existingFrameSymbols.has(symbol)) continue;
    const lastUse = Math.max(...flow.uses.get(symbol) ?? [lifetime.declaredAt]);
    const firstYield = flow.yields.find(
      (item) => lifetime.declaredAt < item.getStart() && item.getStart() < lastUse,
    );
    if (!firstYield) continue;
    const insertion = lifetime.insertion ?? frameInsertionFor(lifetime.binding, fn);
    if (!insertion) {
      diagnostics.push({
        functionStart: fn.getStart(),
        yield: { start: firstYield.getStart(), end: firstYield.getEnd() },
        names: [symbol.name],
        message: `@engine262/babel-compiler: cannot insert a GC frame for ${symbol.name}`,
      });
      continue;
    }
    const owner = insertion.node.parent;
    const key = `${firstYield.getStart()}:${owner.getStart()}:${owner.getEnd()}`;
    const group = groups.get(key);
    if (group) {
      group.names.add(symbol.name);
      if (group.insertion.key < insertion.key) group.insertion = insertion;
    } else {
      groups.set(key, { insertion, names: new Set([symbol.name]), yield: firstYield });
    }
  }

  const frameName = evaluatorFrameName(fn);
  const displayName = evaluatorDisplayName(fn);
  for (const group of [...groups.values()].sort((a, b) => a.insertion.key - b.insertion.key)) {
    const yieldAt = group.yield.getStart();
    if (
      (group.insertion.mode === 'before' && group.insertion.key > yieldAt)
      || (group.insertion.mode === 'after' && group.insertion.key >= yieldAt)
    ) {
      diagnostics.push({
        functionStart: fn.getStart(),
        yield: { start: yieldAt, end: group.yield.getEnd() },
        names: [...group.names].sort(),
        message: '@engine262/babel-compiler: GC frame insertion would occur after its suspension',
      });
      continue;
    }
    plans.push({
      functionStart: fn.getStart(),
      functionEnd: fn.getEnd(),
      yield: {
        start: group.yield.getStart(),
        end: group.yield.getEnd(),
      },
      insertion: {
        mode: group.insertion.mode,
        start: group.insertion.node.getStart(),
        end: group.insertion.node.getEnd(),
      },
      names: [...group.names].sort(),
      frameName,
      displayName,
    });
  }
}

function isEvaluator(fn: ts.FunctionLikeDeclaration, checker: ts.TypeChecker): boolean {
  if (fn.type && /Evaluator(?:YieldType)?$/.test(fn.type.getText().replaceAll(/\s/g, ''))) return true;
  const signature = checker.getSignatureFromDeclaration(fn);
  const returnType = signature && checker.getReturnTypeOfSignature(signature);
  const name = returnType?.aliasSymbol?.name ?? returnType?.getSymbol()?.name ?? '';
  const text = returnType ? checker.typeToString(returnType) : '';
  return name.endsWith('Evaluator') || /(?:^|\b)Evaluator(?:YieldType|<)/.test(text);
}

export interface FrameInsertion {
  readonly mode: 'before' | 'after';
  readonly node: ts.Statement;
  readonly key: number;
}

function frameInsertionFor(binding: ts.Identifier, fn: ts.FunctionLikeDeclaration): FrameInsertion | undefined {
  let current: ts.Node | undefined = binding;
  while (current && current !== fn) {
    if (ts.isParameter(current)) return blockStartInsertion(fn.body);
    if (ts.isVariableDeclaration(current)) {
      const owner = current.parent.parent;
      if (ts.isVariableStatement(owner)) return { mode: 'after', node: owner, key: owner.getEnd() };
      // Matches `for (const x of y) { ... }` and `for (const x in y) { ... }`.
      if ((ts.isForOfStatement(owner) || ts.isForInStatement(owner)) && ts.isBlock(owner.statement)) {
        return blockStartInsertion(owner.statement);
      }
      return undefined;
    }
    if (ts.isCatchClause(current)) return blockStartInsertion(current.block);
    current = current.parent;
  }
  return undefined;
}

function blockStartInsertion(body: ts.ConciseBody | undefined): FrameInsertion | undefined {
  if (!body || !ts.isBlock(body) || body.statements.length === 0) return undefined;
  return { mode: 'before', node: body.statements[0], key: body.statements[0].getStart() };
}

function evaluatorFrameName(fn: ts.FunctionLikeDeclaration): string {
  const displayName = evaluatorDisplayName(fn);
  if (hasSpecLink(fn)) return JSON.stringify(displayName);
  const reference = functionReference(fn);
  return reference ? `${reference}.specName || ${JSON.stringify(displayName)}` : JSON.stringify(displayName);
}

function evaluatorDisplayName(fn: ts.FunctionLikeDeclaration): string {
  return javascriptFunctionName(functionSourceName(fn));
}

function functionSourceName(fn: ts.FunctionLikeDeclaration): string {
  const direct = propertyName(fn.name);
  if (direct) return direct;
  if (
    (ts.isFunctionExpression(fn) || ts.isArrowFunction(fn))
    && ts.isVariableDeclaration(fn.parent)
    && ts.isIdentifier(fn.parent.name)
  ) return fn.parent.name.text;
  return 'evaluator';
}

function functionReference(fn: ts.FunctionLikeDeclaration): string | undefined {
  // Matches `function name() { ... }`.
  if (ts.isFunctionDeclaration(fn) && fn.name) return fn.name.text;
  if (
    // Matches `const name = function () { ... }` and `const name = () => { ... }`.
    (ts.isFunctionExpression(fn) || ts.isArrowFunction(fn))
    && ts.isVariableDeclaration(fn.parent)
    && ts.isIdentifier(fn.parent.name)
  ) return fn.parent.name.text;
  // Matches `class C { method() { ... } }`.
  if (ts.isMethodDeclaration(fn) && ts.isClassLike(fn.parent) && fn.parent.name) {
    const member = propertyName(fn.name);
    if (!member) return undefined;
    return `${fn.parent.name.text}${fn.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) ? '' : '.prototype'}.${member}`;
  }
  return undefined;
}

function hasSpecLink(fn: ts.FunctionLikeDeclaration): boolean {
  // Matches `function name() { ... }`.
  if (ts.isFunctionDeclaration(fn) && fn.name) {
    const siblings = statementList(fn.parent);
    const index = siblings?.indexOf(fn) ?? -1;
    for (let i = index - 1; siblings && i >= 0; i -= 1) {
      const overload = siblings[i];
      if (!ts.isFunctionDeclaration(overload) || overload.name?.text !== fn.name.text || overload.body) break;
      if (specLinkPattern.test(commentText(overload))) return true;
    }
  }
  return specLinkPattern.test(commentText(fn));
}

const specLinkPattern = /https:\/\/tc39\.es\/[^\s#]+#[^\s]+|#sec-[^\s]+/;

function commentText(node: ts.Node): string {
  return node.getSourceFile().text.slice(node.getFullStart(), node.getStart());
}

function statementList(node: ts.Node): readonly ts.Statement[] | undefined {
  if (ts.isBlock(node) || ts.isSourceFile(node)) return node.statements;
  return undefined;
}

function propertyName(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (name && (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))) return name.text;
  return undefined;
}

function javascriptFunctionName(name: string): string {
  const temporal = /^(Duration|Instant|PlainDate|PlainDateTime|PlainMonthDay|PlainTime|PlainYearMonth|ZonedDateTime)Proto_(.+)$/.exec(name);
  if (temporal) return `Temporal.${temporal[1]}.prototype.${temporal[2]}`;
  const prototype = /^(.+?)(?:Proto|Prototype)_(.+)$/.exec(name);
  if (prototype) return `${prototype[1]}.prototype.${prototype[2]}`;
  const staticMethod = /^(Array|BigInt|Date|Iterator|JSON|Map|Math|Object|Promise|Reflect|String|Symbol|TypedArray|Uint8Array)_(.+)$/.exec(name);
  if (staticMethod) return `${staticMethod[1]}.${staticMethod[2]}`;
  return name;
}

function isCaptureEvaluatorFrameCall(node: ts.Node): node is ts.CallExpression & {
  readonly arguments: ts.NodeArray<ts.Expression> & { readonly 0: ts.Expression };
} {
  return ts.isCallExpression(node)
    && ts.isIdentifier(node.expression)
    && node.expression.text === 'captureEvaluatorFrame'
    && node.arguments[0] !== undefined;
}

export function referencedSymbols(node: ts.Node, checker: ts.TypeChecker): Set<ts.Symbol> {
  const symbols = new Set<ts.Symbol>();
  const visit = (child: ts.Node) => {
    if (ts.isIdentifier(child) && isIdentifierReference(child)) {
      const symbol = ts.isShorthandPropertyAssignment(child.parent)
        ? checker.getShorthandAssignmentValueSymbol(child.parent)
        : checker.getSymbolAtLocation(child);
      if (symbol) symbols.add(symbol);
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return symbols;
}

/** Returns whether an identifier refers to a symbol rather than declaring or naming syntax. */
export function isIdentifierReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  // Matches the property name in `object.name`.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  // Matches the right-hand name in `Namespace.name`.
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  // Matches the non-computed property name in `{ name: value }`.
  if (ts.isPropertyAssignment(parent) && parent.name === node && !ts.isComputedPropertyName(parent.name)) return false;
  // Matches the method name in `class C { name() {} }`.
  if (ts.isMethodDeclaration(parent) && parent.name === node) return false;
  // Matches the binding name in `const { name } = value`.
  if (ts.isBindingElement(parent) && parent.name === node) return false;
  // Matches the binding name in `const name = value`.
  if (ts.isVariableDeclaration(parent) && parent.name === node) return false;
  // Matches the parameter name in `function f(name) {}`.
  if (ts.isParameter(parent) && parent.name === node) return false;
  return true;
}

function isFunctionLikeDeclaration(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node);
}

function isBindingFromEnclosingFunction(symbol: ts.Symbol, fn: ts.FunctionLikeDeclaration): boolean {
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration || declaration.getSourceFile() !== fn.getSourceFile()) return false;
  if (isAncestor(fn, declaration)) return false;
  let parent = fn.parent;
  while (parent) {
    if (isFunctionLikeDeclaration(parent) && isAncestor(parent, declaration)) return true;
    parent = parent.parent;
  }
  return false;
}

function isAncestor(parent: ts.Node, child: ts.Node): boolean {
  let current: ts.Node | undefined = child;
  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
}

function findSourceFile(program: ts.Program, fileName: string): ts.SourceFile | undefined {
  const normalized = normalize(fileName);
  return program.getSourceFiles().find((sourceFile) => normalize(sourceFile.fileName) === normalized);
}

function normalize(fileName: string): string {
  return path.resolve(fileName).replaceAll('\\', '/');
}
