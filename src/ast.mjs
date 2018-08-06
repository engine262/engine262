// #prod-BindingIdentifier
export function isBindingIdentifier(node) {
  return node.type === 'Identifier';
}

// Used in #prod-SingleNameBinding
export function isBindingIdentifierAndInitializer(node) {
  return node.type === 'AssignmentPattern' && isBindingIdentifier(node.left);
}

// #prod-SingleNameBinding
export function isSingleNameBinding(node) {
  return isBindingIdentifier(node) || isBindingIdentifierAndInitializer(node);
}

// Used in #prod-BindingElement
export function isBindingPatternAndInitializer(node) {
  return node.type === 'AssignmentPattern' && isBindingPattern(node.left);
}

// #prod-BindingElement
export function isBindingElement(node) {
  return isSingleNameBinding(node) ||
         isBindingPattern(node) ||
         isBindingPatternAndInitializer(node);
}

// #prod-BindingRestElement
export function isBindingRestElement(node) {
  return node.type === 'RestElement';
}

// #prod-BindingProperty
export function isBindingProperty(node) {
  // ESTree puts the SingleNameBinding in node.value.
  return node.type === 'Property' && isBindingElement(node.value);
}

// #prod-BindingRestProperty
export function isBindingRestProperty(node) {
  return node.type === 'RestElement';
}

// #prod-BlockStatement
export function isBlockStatement(node) {
  return node.type === 'BlockStatement';
}

// #prod-BindingPattern
export function isBindingPattern(node) {
  return isObjectBindingPattern(node) || isArrayBindingPattern(node);
}

// #prod-ObjectBindingPattern
export function isObjectBindingPattern(node) {
  return node.type === 'ObjectPattern';
}

// #prod-ArrayBindingPattern
export function isArrayBindingPattern(node) {
  return node.type === 'ArrayPattern';
}

// #prod-BlockStatement
export const isBlock = isBlockStatement;

// #prod-VariableStatement
export function isVariableStatement(node) {
  return node.type === 'VariableDeclaration';
}

// #prod-EmptyStatement
export function isEmptyStatement(node) {
  return node.type === 'EmptyStatement';
}

// #prod-ExpressionStatement
export function isExpressionStatement(node) {
  return node.type === 'ExpressionStatement';
}

// #prod-IfStatement
export function isIfStatement(node) {
  return node.type === 'IfStatement';
}

// #prod-BreakableStatement
export function isBreakableStatement(node) {
  return isIterationStatement(node) || isSwitchStatement(node);
}

// #prod-IterationStatement
export function isIterationStatement(node) {
  // for-await-of is ForOfStatement with await = true
  return node.type === 'DoWhileStatement' ||
         node.type === 'WhileStatement' ||
         node.type === 'ForStatement' ||
         node.type === 'ForInStatement' ||
         node.type === 'ForOfStatement';
}

// #prod-SwitchStatement
export function isSwitchStatement(node) {
  return node.type === 'SwitchStatement';
}

// #prod-ContinueStatement
export function isContinueStatement(node) {
  return node.type === 'ContinueStatement';
}

// #prod-BreakStatement
export function isBreakStatement(node) {
  return node.type === 'BreakStatement';
}

// #prod-ReturnStatement
export function isReturnStatement(node) {
  return node.type === 'ReturnStatement';
}

// #prod-WithStatement
export function isWithStatement(node) {
  return node.type === 'WithStatement';
}

// #prod-LabelledStatement
export function isLabelledStatement(node) {
  return node.type === 'LabeledStatement'; // sic
}

// #prod-ThrowStatement
export function isThrowStatement(node) {
  return node.type === 'ThrowStatement';
}

// #prod-TryStatement
export function isTryStatement(node) {
  return node.type === 'TryStatement';
}

// #prod-DebuggerStatement
export function isDebuggerStatement(node) {
  return node.type === 'DebuggerStatement';
}

// #prod-Statement
export function isStatement(node) {
  return isBlockStatement(node) ||
         isVariableStatement(node) ||
         isEmptyStatement(node) ||
         isExpressionStatement(node) ||
         isIfStatement(node) ||
         isBreakableStatement(node) ||
         isContinueStatement(node) ||
         isBreakStatement(node) ||
         isReturnStatement(node) ||
         isWithStatement(node) ||
         isLabelledStatement(node) ||
         isThrowStatement(node) ||
         isTryStatement(node) ||
         isDebuggerStatement(node);
}

// #prod-Declaration
export function isDeclaration(node) {
  return isHoistableDeclaration(node) ||
         isClassDeclaration(node) ||
         isLexicalDeclaration(node);
}

// #prod-HoistableDeclaration
// The other kinds of HoistableDeclarations are grouped under
// FunctionDeclaration in ESTree.
export function isHoistableDeclaration(node) {
  return node.type === 'FunctionDeclaration';
}

// #prod-FunctionDeclaration
export function isFunctionDeclaration(node) {
  return node.type === 'FunctionDeclaration' &&
         !node.generator &&
         !node.async;
}

// #prod-GeneratorDeclaration
export function isGeneratorDeclaration(node) {
  return node.type === 'FunctionDeclaration' &&
         node.generator &&
         !node.async;
}

// #prod-AsyncFunctionDeclaration
export function isAsyncFunctionDeclaration(node) {
  return node.type === 'FunctionDeclaration' &&
         !node.generator &&
         node.async;
}

// #prod-AsyncGeneratorDeclaration
export function isAsyncGeneratorDeclaration(node) {
  return node.type === 'FunctionDeclaration' &&
         node.generator &&
         node.async;
}

// #prod-ClassDeclaration
export function isClassDeclaration(node) {
  return node.type === 'ClassDeclaration';
}

// #prod-LexicalDeclaration
export function isLexicalDeclaration(node) {
  return node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const');
}
