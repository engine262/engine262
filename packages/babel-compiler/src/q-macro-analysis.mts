export const qMacroNames = [
  'Assert',
  'Q',
  'ReturnIfAbrupt',
  'X',
  'IfAbruptCloseIterator',
  'IfAbruptCloseIterators',
  'IfAbruptCloseAsyncIterator',
  'IfAbruptRejectPromise',
  'Throw',
] as const;

export type QMacroName = typeof qMacroNames[number];

export interface QMacroSyntaxNode {
  readonly type: string;
  readonly start?: number | null;
  readonly end?: number | null;
  readonly range?: readonly [number, number];
}

export type QMacroVisitorKeys = Readonly<Record<string, readonly string[]>>;

export interface QMacroTransformationPlan {
  readonly start: number;
  readonly end: number;
  readonly name: QMacroName;
}

export interface QMacroTransformationDiagnostic {
  readonly start: number;
  readonly end: number;
  readonly name: QMacroName;
  readonly message: string;
}

export interface QMacroAnalysisResult {
  readonly plans: readonly QMacroTransformationPlan[];
  readonly diagnostics: readonly QMacroTransformationDiagnostic[];
}

const qMacroNameSet: ReadonlySet<string> = new Set(qMacroNames);

/** Builds syntax-only macro transformation plans directly from a Babel or ESTree tree. */
export function analyzeQMacroTransformations(
  root: QMacroSyntaxNode,
  visitorKeys: QMacroVisitorKeys,
): QMacroAnalysisResult {
  const plans: QMacroTransformationPlan[] = [];
  const diagnostics: QMacroTransformationDiagnostic[] = [];
  const visit = (node: QMacroSyntaxNode, ancestors: readonly QMacroSyntaxNode[]) => {
    const callee = property(node, 'callee');
    if (
      node.type === 'CallExpression'
      && isIdentifier(callee)
      && qMacroNameSet.has(callee.name)
      && !isParameterShadowed(callee.name, ancestors)
    ) {
      const name = callee.name as QMacroName;
      const message = untransformableReason(node, name, ancestors);
      const item = { ...span(node), name };
      if (message) diagnostics.push({ ...item, message });
      else plans.push(item);
    }
    for (const child of children(node, visitorKeys)) visit(child, [...ancestors, node]);
  };
  visit(root, []);
  return { plans, diagnostics };
}

/** Returns the first structural reason that prevents the Babel macro rewrite. */
function untransformableReason(
  call: QMacroSyntaxNode,
  name: QMacroName,
  ancestors: readonly QMacroSyntaxNode[],
): string | undefined {
  const argument = arrayProperty(call, 'arguments')[0];
  if (!argument) return `${name}() requires a first argument`;
  if (argument.type === 'SpreadElement') return `${name}() cannot be called with a spread argument`;

  if (requiresFunctionContext(name) && !ancestors.some(isFunctionLike)) {
    return `${name}() cannot be used outside a function`;
  }
  if (isWithinUnsupportedControlPosition(call, ancestors)) {
    return `${name}() cannot be transformed in this control-flow position`;
  }

  const conditional = findEnclosingConditionalExpression(ancestors);
  if (conditional) {
    const parent = parentOf(conditional, ancestors);
    if (
      !parent
      || parent.type !== 'VariableDeclarator'
      || property(parent, 'init') !== conditional
      || !isIdentifier(property(parent, 'id'))
    ) {
      return `${name}() cannot be transformed within this conditional expression`;
    }
  }

  const arrow = findLast(ancestors, (node) => node.type === 'ArrowFunctionExpression');
  if (
    arrow && property(arrow, 'body') === call
    && name !== 'Q'
    && name !== 'ReturnIfAbrupt'
    && name !== 'Throw'
  ) {
    return `${name}() cannot be the sole expression of an arrow function`;
  }

  if (name === 'IfAbruptRejectPromise') {
    if (!isIdentifier(argument)) {
      return 'The first argument to IfAbruptRejectPromise must be an identifier';
    }
    if (!isIdentifier(arrayProperty(call, 'arguments')[1])) {
      return 'The second argument to IfAbruptRejectPromise must be an identifier';
    }
  }
  if (
    name === 'IfAbruptCloseIterator'
    || name === 'IfAbruptCloseIterators'
    || name === 'IfAbruptCloseAsyncIterator'
  ) {
    if (!isIdentifier(argument)) {
      return `The first argument to ${name} must be an identifier`;
    }
    if (!isIdentifier(arrayProperty(call, 'arguments')[1])) {
      return `The second argument to ${name} must be an identifier`;
    }
  }

  if (
    name !== 'Assert'
    && !ancestors.some(isStatement)
    && (!arrow || property(arrow, 'body') !== call)
  ) {
    return `${name}() has no containing statement`;
  }
  return undefined;
}

/** Identifies macros whose templates can return from their containing function. */
function requiresFunctionContext(name: QMacroName): boolean {
  return name === 'Q'
    || name === 'ReturnIfAbrupt'
    || name === 'IfAbruptCloseIterator'
    || name === 'IfAbruptCloseIterators'
    || name === 'IfAbruptCloseAsyncIterator'
    || name === 'IfAbruptRejectPromise'
    || name === 'Throw';
}

/** Detects the control-flow tests where hoisting macro statements changes semantics. */
function isWithinUnsupportedControlPosition(
  call: QMacroSyntaxNode,
  ancestors: readonly QMacroSyntaxNode[],
): boolean {
  let child = call;
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (
      (parent.type === 'WhileStatement' || parent.type === 'DoWhileStatement')
      && property(parent, 'test') === child
    ) return true;
    if (parent.type === 'ForStatement' && property(parent, 'test') === child) return true;
    if (parent.type === 'SwitchStatement' && property(parent, 'discriminant') === child) return true;
    if (parent.type === 'SwitchCase' && property(parent, 'test') === child) return true;
    if (parent.type === 'IfStatement') {
      if (property(parent, 'consequent') === child || property(parent, 'alternate') === child) return false;
      const test = property(parent, 'test');
      if (
        isSyntaxNode(test)
        && isInRightOperandOfBinaryExpression(call, test, ancestors)
      ) return true;
    }
    if (isStatement(parent)) return false;
    child = parent;
  }
  return false;
}

/** Checks whether a call occurs in a conditionally evaluated binary right operand. */
function isInRightOperandOfBinaryExpression(
  call: QMacroSyntaxNode,
  expression: QMacroSyntaxNode,
  ancestors: readonly QMacroSyntaxNode[],
): boolean {
  let child = call;
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (
      (parent.type === 'BinaryExpression' || parent.type === 'LogicalExpression')
      && property(parent, 'right') === child
    ) return true;
    if (parent === expression) return false;
    child = parent;
  }
  return false;
}

/** Finds an enclosing conditional expression before the nearest statement boundary. */
function findEnclosingConditionalExpression(
  ancestors: readonly QMacroSyntaxNode[],
): QMacroSyntaxNode | undefined {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const current = ancestors[index];
    if (isStatement(current)) return undefined;
    if (current.type === 'ConditionalExpression') return current;
  }
  return undefined;
}

/** Excludes callback parameters whose names shadow compiler macros. */
function isParameterShadowed(
  name: string,
  ancestors: readonly QMacroSyntaxNode[],
): boolean {
  return ancestors.some((node) => (
    isFunctionLike(node)
    && arrayProperty(node, 'params').some((parameter) => bindingContainsName(parameter, name))
  ));
}

/** Tests whether a Babel or ESTree binding pattern declares a particular identifier. */
function bindingContainsName(binding: QMacroSyntaxNode, name: string): boolean {
  if (isIdentifier(binding)) return binding.name === name;
  if (binding.type === 'RestElement') {
    const argument = property(binding, 'argument');
    return isSyntaxNode(argument) && bindingContainsName(argument, name);
  }
  if (binding.type === 'AssignmentPattern') {
    const left = property(binding, 'left');
    return isSyntaxNode(left) && bindingContainsName(left, name);
  }
  if (binding.type === 'TSParameterProperty') {
    const parameter = property(binding, 'parameter');
    return isSyntaxNode(parameter) && bindingContainsName(parameter, name);
  }
  if (binding.type === 'ArrayPattern') {
    return arrayProperty(binding, 'elements').some((element) => bindingContainsName(element, name));
  }
  if (binding.type === 'ObjectPattern') {
    return arrayProperty(binding, 'properties').some((patternProperty) => {
      if (patternProperty.type === 'RestElement') return bindingContainsName(patternProperty, name);
      const value = property(patternProperty, 'value');
      return isSyntaxNode(value) && bindingContainsName(value, name);
    });
  }
  return false;
}

function children(
  node: QMacroSyntaxNode,
  visitorKeys: QMacroVisitorKeys,
): readonly QMacroSyntaxNode[] {
  const result: QMacroSyntaxNode[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    const value = property(node, key);
    if (isSyntaxNode(value)) result.push(value);
    else if (Array.isArray(value)) result.push(...value.filter(isSyntaxNode));
  }
  return result;
}

function span(node: QMacroSyntaxNode): { readonly start: number; readonly end: number } {
  const start = node.start ?? node.range?.[0];
  const end = node.end ?? node.range?.[1];
  if (start === undefined || end === undefined) {
    throw new TypeError(`Q macro ${node.type} node does not have a source range`);
  }
  return { start, end };
}

function isSyntaxNode(value: unknown): value is QMacroSyntaxNode {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { readonly type?: unknown }).type === 'string';
}

function isIdentifier(value: unknown): value is QMacroSyntaxNode & { readonly name: string } {
  return isSyntaxNode(value)
    && value.type === 'Identifier'
    && typeof property(value, 'name') === 'string';
}

function arrayProperty(node: QMacroSyntaxNode, key: string): readonly QMacroSyntaxNode[] {
  const value = property(node, key);
  return Array.isArray(value) ? value.filter(isSyntaxNode) : [];
}

function property(node: QMacroSyntaxNode, key: string): unknown {
  return (node as unknown as Readonly<Record<string, unknown>>)[key];
}

function isFunctionLike(node: QMacroSyntaxNode): boolean {
  return node.type === 'FunctionDeclaration'
    || node.type === 'FunctionExpression'
    || node.type === 'ArrowFunctionExpression'
    || node.type === 'ObjectMethod'
    || node.type === 'ClassMethod'
    || node.type === 'ClassPrivateMethod'
    || node.type === 'TSDeclareFunction';
}

function isStatement(node: QMacroSyntaxNode): boolean {
  return node.type.endsWith('Statement')
    || node.type === 'VariableDeclaration'
    || node.type === 'FunctionDeclaration'
    || node.type === 'ClassDeclaration'
    || node.type === 'ImportDeclaration'
    || node.type === 'ExportNamedDeclaration'
    || node.type === 'ExportDefaultDeclaration';
}

function parentOf(
  node: QMacroSyntaxNode,
  ancestors: readonly QMacroSyntaxNode[],
): QMacroSyntaxNode | undefined {
  const index = ancestors.lastIndexOf(node);
  return index > 0 ? ancestors[index - 1] : undefined;
}

function findLast(
  nodes: readonly QMacroSyntaxNode[],
  predicate: (node: QMacroSyntaxNode) => boolean,
): QMacroSyntaxNode | undefined {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    if (predicate(nodes[index])) return nodes[index];
  }
  return undefined;
}
