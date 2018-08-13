// #prod-NullLiteral
export function isNullLiteral(node) {
  return node.type === 'Literal' && node.value === null;
}

// #prod-BooleanLiteral
export function isBooleanLiteral(node) {
  return node.type === 'Literal' && typeof node.value === 'boolean';
}

// #prod-NumericLiteral
export function isNumericLiteral(node) {
  return node.type === 'Literal' && typeof node.value === 'number';
}

// #prod-StringLiteral
export function isStringLiteral(node) {
  return node.type === 'Literal' && typeof node.value === 'string';
}

// #prod-RegularExpressionLiteral
export function isRegularExpressionLiteral(node) {
  return node.type === 'Literal' && typeof node.regex === 'object';
}

// #prod-Identifier
// Not exact, as we allow reserved words when appropriate. (This is more like
// IdentifierReference.)
export function isIdentifier(node) {
  return node.type === 'Identifier';
}

// #prod-IdentifierReference
export const isIdentifierReference = isIdentifier;

// #prod-BindingIdentifier
export const isBindingIdentifier = isIdentifier;

// #prod-LabelIdentifier
export const isLabelIdentifier = isIdentifier;

// Used in #prod-PrimaryExpression
export function isThis(node) {
  return node.type === 'ThisExpression';
}

// #prod-Literal
export function isLiteral(node) {
  // Just checking node.type is not enough as RegularExpressionLiteral also
  // uses 'Literal' as node.type.
  return isNullLiteral(node)
         || isBooleanLiteral(node)
         || isNumericLiteral(node)
         || isStringLiteral(node);
}

// #prod-ArrayLiteral
export function isArrayLiteral(node) {
  return node.type === 'ArrayExpression';
}

// #prod-ObjectLiteral
export function isObjectLiteral(node) {
  return node.type === 'ObjectExpression';
}

// #prod-FunctionExpression
export function isFunctionExpression(node) {
  return node.type === 'FunctionExpression'
         && !node.generator
         && !node.async;
}

// #prod-ClassExpression
export function isClassExpression(node) {
  return node.type === 'ClassExpression';
}

// #prod-GeneratorExpression
export function isGeneratorExpression(node) {
  return node.type === 'FunctionExpression'
         && node.generator
         && !node.async;
}

// #prod-AsyncFunctionExpression
export function isAsyncFunctionExpression(node) {
  return node.type === 'FunctionExpression'
         && !node.generator
         && node.async;
}

// #prod-AsyncGeneratorExpression
export function isAsyncGeneratorExpression(node) {
  return node.type === 'FunctionExpression'
         && node.generator
         && node.async;
}

// #prod-TemplateLiteral
export function isTemplateLiteral(node) {
  return node.type === 'TemplateLiteral';
}

// #prod-PrimaryExpression
export function isPrimaryExpression(node) {
  return isThis(node)
         || isIdentifierReference(node)
         || isLiteral(node)
         || isArrayLiteral(node)
         || isObjectLiteral(node)
         || isFunctionExpression(node)
         || isClassExpression(node)
         || isGeneratorExpression(node)
         || isAsyncFunctionExpression(node)
         || isAsyncGeneratorExpression(node)
         || isRegularExpressionLiteral(node)
         || isTemplateLiteral(node);
}

export const isPrimaryExpressionWithThis = isThis;

// Used in #prod-MemberExpression
export function isMemberExpressionWithBrackets(node) {
  return node.type === 'MemberExpression'
         && node.computed
         && isMemberExpression(node.object);
}

// Used in #prod-MemberExpression
export function isMemberExpressionWithDot(node) {
  return node.type === 'MemberExpression'
         && !node.computed
         && isMemberExpression(node.object);
}

// Used in #prod-MemberExpression
export function isMemberExpressionWithTaggedTemplate(node) {
  return node.type === 'TaggedTemplateExpression'
         && isMemberExpression(node.tag);
}

// #prod-SuperProperty
export function isSuperProperty(node) {
  return node.type === 'MemberExpression' && node.object.type === 'Super';
}

// #prod-MetaProperty
export function isMetaProperty(node) {
  return node.type === 'MetaProperty';
}

// #prod-NewTarget
export function isNewTarget(node) {
  return isMetaProperty(node)
         && node.meta.name === 'new'
         && node.property.name === 'target';
}

// Used in #prod-MemberExpression
export function isMemberExpressionWithNew(node) {
  return node.type === 'NewExpression';
}

// #prod-MemberExpression
export function isMemberExpression(node) {
  return isPrimaryExpression(node)
         || isMemberExpressionWithBrackets(node)
         || isMemberExpressionWithDot(node)
         || isMemberExpressionWithTaggedTemplate(node)
         || isSuperProperty(node)
         || isMetaProperty(node)
         || isMemberExpressionWithNew(node);
}

// #prod-NewExpression
export function isNewExpression(node) {
  return node.type === 'NewExpression' || isMemberExpression(node);
}

// #prod-CallMemberExpression
export function isCallMemberExpression(node) {
  return node.type === 'CallExpression' && isMemberExpression(node.callee);
}

// #prod-SuperCall
export function isSuperCall(node) {
  return node.type === 'CallExpression' && node.callee.type === 'Super';
}

// Used in #prod-CallExpression
export function isCallExpressionWithCall(node) {
  return node.type === 'CallExpression' && isCallExpression(node.callee);
}

// Used in #prod-CallExpression
export function isCallExpressionWithBrackets(node) {
  return node.type === 'MemberExpression'
         && node.computed
         && isCallExpression(node.object);
}

// Used in #prod-CallExpression
export function isCallExpressionWithDot(node) {
  return node.type === 'MemberExpression'
         && !node.computed
         && isCallExpression(node.object);
}

// Used in #prod-CallExpression
export function isCallExpressionWithTaggedTemplate(node) {
  return node.type === 'TaggedTemplateExpression'
         && isCallExpression(node.tag);
}

// #prod-CallExpression
export function isCallExpression(node) {
  return isCallMemberExpression(node)
         || isSuperCall(node)
         || isCallExpressionWithCall(node)
         || isCallExpressionWithBrackets(node)
         || isCallExpressionWithDot(node)
         || isCallExpressionWithTaggedTemplate(node);
}

// #prod-LeftHandSideExpression
export function isLeftHandSideExpression(node) {
  return isNewExpression(node) || isCallExpression(node);
}

// Used in #prod-UpdateExpression
export function isActualUpdateExpression(node) {
  return node.type === 'UpdateExpression';
}

// #prod-UpdateExpression
export function isUpdateExpression(node) {
  return isLeftHandSideExpression(node) || isActualUpdateExpression(node);
}

// Used in #prod-UnaryExpression
export function isActualUnaryExpression(node) {
  return node.type === 'UnaryExpression';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithDelete(node) {
  return node.type === 'UnaryExpression' && node.operator === 'delete';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithVoid(node) {
  return node.type === 'UnaryExpression' && node.operator === 'void';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithTypeof(node) {
  return node.type === 'UnaryExpression' && node.operator === 'typeof';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithPlus(node) {
  return node.type === 'UnaryExpression' && node.operator === '+';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithMinus(node) {
  return node.type === 'UnaryExpression' && node.operator === '-';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithTilde(node) {
  return node.type === 'UnaryExpression' && node.operator === '~';
}

// Used in #prod-UnaryExpression
export function isUnaryExpressionWithBang(node) {
  return node.type === 'UnaryExpression' && node.operator === '!';
}

// #prod-AwaitExpression
export function isAwaitExpression(node) {
  return node.type === 'AwaitExpression';
}

// #prod-UnaryExpression
export function isUnaryExpression(node) {
  return isUpdateExpression(node)
         || isActualUnaryExpression(node)
         || isAwaitExpression(node);
}

// Used in #prod-ExponentiationExpression
export function isActualExponentiationExpression(node) {
  return node.type === 'ExponentiationExpression';
}

// #prod-ExponentiationExpression
export function isExponentiationExpression(node) {
  return isUnaryExpression(node) || isActualExponentiationExpression(node);
}

// Used in #prod-MultiplicativeExpression
export function isActualMultiplicativeExpression(node) {
  return node.type === 'BinaryExpression'
         && (
           node.operator === '*'
           || node.operator === '/'
           || node.operator === '%'
         );
}

// #prod-MultiplicativeExpression
export function isMultiplicativeExpression(node) {
  return isExponentiationExpression(node) || isActualMultiplicativeExpression(node);
}

// Used in #prod-AdditiveExpression
export function isActualAdditiveExpression(node) {
  return node.type === 'BinaryExpression'
         && (node.operator === '+' || node.operator === '-');
}

// #prod-AdditiveExpression
export function isAdditiveExpression(node) {
  return isMultiplicativeExpression(node) || isActualAdditiveExpression(node);
}

// Used in #prod-AdditiveExpression
export function isAdditiveExpressionWithPlus(node) {
  return isActualAdditiveExpression(node) && node.operator === '+';
}

// Used in #prod-AdditiveExpression
export function isAdditiveExpressionWithMinus(node) {
  return isActualAdditiveExpression(node) && node.operator === '-';
}

// Used in #prod-ShiftExpression
export function isActualShiftExpression(node) {
  return node.type === 'BinaryExpression'
         && (
           node.operator === '<<'
           || node.operator === '>>'
           || node.operator === '>>>'
         );
}

// #prod-ShiftExpression
export function isShiftExpression(node) {
  return isAdditiveExpression(node) || isActualShiftExpression(node);
}

// Used in #prod-RelationalExpression
export function isActualRelationalExpression(node) {
  return node.type === 'BinaryExpression'
         && (
           node.operator === '<'
           || node.operator === '>'
           || node.operator === '<='
           || node.operator === '>='
           || node.operator === 'instanceof'
           || node.operator === 'in'
         );
}

// #prod-RelationalExpression
export function isRelationalExpression(node) {
  return isShiftExpression(node) || isActualRelationalExpression(node);
}

// Used in #prod-EqualityExpression
export function isActualEqualityExpression(node) {
  return node.type === 'BinaryExpression'
         && (
           node.operator === '=='
           || node.operator === '!='
           || node.operator === '==='
           || node.operator === '!=='
         );
}

// #prod-EqualityExpression
export function isEqualityExpression(node) {
  return isRelationalExpression(node) || isActualEqualityExpression(node);
}

// Used in #prod-BitwiseANDExpression
export function isActualBitwiseANDExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '&';
}

// #prod-BitwiseANDExpression
export function isBitwiseANDExpression(node) {
  return isEqualityExpression(node) || isActualBitwiseANDExpression(node);
}

// Used in #prod-BitwiseXORExpression
export function isActualBitwiseXORExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '^';
}

// #prod-BitwiseXORExpression
export function isBitwiseXORExpression(node) {
  return isBitwiseANDExpression(node) || isActualBitwiseXORExpression(node);
}

// Used in #prod-BitwiseORExpression
export function isActualBitwiseORExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '|';
}

// #prod-BitwiseORExpression
export function isBitwiseORExpression(node) {
  return isBitwiseXORExpression(node) || isActualBitwiseORExpression(node);
}

// Used in #prod-LogicalANDExpression
export function isActualLogicalANDExpression(node) {
  return node.type === 'LogicalExpression' && node.operator === '&&';
}

// #prod-LogicalANDExpression
export function isLogicalANDExpression(node) {
  return isBitwiseORExpression(node) || isActualLogicalANDExpression(node);
}

// Used in #prod-LogicalORExpression
export function isActualLogicalORExpression(node) {
  return node.type === 'LogicalExpression' && node.operator === '||';
}

// #prod-LogicalORExpression
export function isLogicalORExpression(node) {
  return isLogicalANDExpression(node) || isActualLogicalORExpression(node);
}

// Used in #prod-ConditionalExpression
export function isActualConditionalExpression(node) {
  return node.type === 'ConditionalExpression';
}

// #prod-ConditionalExpression
export function isConditionalExpression(node) {
  return isLogicalORExpression(node) || isActualConditionalExpression(node);
}

// #prod-YieldExpression
export function isYieldExpression(node) {
  return node.type === 'YieldExpression';
}

// #prod-ArrowFunction
export function isArrowFunction(node) {
  return node.type === 'ArrowFunctionExpression'
         && !node.async
         && !node.generator;
}

// #prod-AsyncArrowFunction
export function isAsyncArrowFunction(node) {
  return node.type === 'ArrowFunctionExpression'
         && node.async
         && !node.generator;
}

// Used in #prod-AssignmentExpression
export function isActualAssignmentExpression(node) {
  return node.type === 'AssignmentExpression';
}

// Used in #prod-AssignmentExpression
export function isAssignmentExpressionWithEquals(node) {
  return isActualAssignmentExpression(node) && node.operator === '=';
}

// Used in #prod-AssignmentExpression
export function isAssignmentExpressionWithAssignmentOperator(node) {
  return isActualAssignmentExpression(node) && node.operator !== '=';
}

// #prod-AssignmentExpression
export function isAssignmentExpression(node) {
  return isConditionalExpression(node)
         || isYieldExpression(node)
         || isArrowFunction(node)
         || isAsyncArrowFunction(node)
         || isActualAssignmentExpression(node);
}

// Used in #prod-Expression
export function isExpressionWithComma(node) {
  return node.type === 'SequenceExpression';
}

// #prod-Expression
export function isExpression(node) {
  return isAssignmentExpression(node)
         || isExpressionWithComma(node);
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
  return isSingleNameBinding(node)
         || isBindingPattern(node)
         || isBindingPatternAndInitializer(node);
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

export function isEmptyObjectBindingPattern(node) {
  return isObjectBindingPattern(node) && node.properties.length === 0;
}

export function isObjectBindingPatternWithBindingPropertyList(node) {
  return isObjectBindingPattern(node)
    && node.properties.length > 0
    && !isBindingRestProperty(node.properties[node.properties.length - 1]);
}

export function isObjectBindingPatternWithSingleBindingRestProperty(node) {
  return isObjectBindingPattern(node)
    && node.properties.length === 1
    && isBindingRestProperty(node.properties[0]);
}

export function isObjectBindingPatternWithBindingPropertyListAndBindingRestProperty(node) {
  return isObjectBindingPattern(node)
    && node.properties.length >= 2
    && isBindingRestProperty(node.properties[node.properties.length - 1]);
}

// #prod-ArrayBindingPattern
export function isArrayBindingPattern(node) {
  return node.type === 'ArrayPattern';
}

// #prod-Block
export const isBlock = isBlockStatement;

// #prod-VariableStatement
export function isVariableStatement(node) {
  return node.type === 'VariableDeclaration' && node.kind === 'var';
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
  return node.type === 'DoWhileStatement'
         || node.type === 'WhileStatement'
         || node.type === 'ForStatement'
         || node.type === 'ForInStatement'
         || node.type === 'ForOfStatement';
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

// Used in #prod-TryStatement
export function isTryStatementWithCatch(node) {
  return isTryStatement(node) && node.handler !== null;
}

// Used in #prod-TryStatement
export function isTryStatementWithFinally(node) {
  return isTryStatement(node) && node.finalizer !== null;
}

// #prod-DebuggerStatement
export function isDebuggerStatement(node) {
  return node.type === 'DebuggerStatement';
}

// #prod-Statement
export function isStatement(node) {
  return isBlockStatement(node)
         || isVariableStatement(node)
         || isEmptyStatement(node)
         || isExpressionStatement(node)
         || isIfStatement(node)
         || isBreakableStatement(node)
         || isContinueStatement(node)
         || isBreakStatement(node)
         || isReturnStatement(node)
         || isWithStatement(node)
         || isLabelledStatement(node)
         || isThrowStatement(node)
         || isTryStatement(node)
         || isDebuggerStatement(node);
}

// #prod-Declaration
export function isDeclaration(node) {
  return isHoistableDeclaration(node)
         || isClassDeclaration(node)
         || isLexicalDeclaration(node);
}

// #prod-HoistableDeclaration
// The other kinds of HoistableDeclarations are grouped under
// FunctionDeclaration in ESTree.
export function isHoistableDeclaration(node) {
  return node.type === 'FunctionDeclaration';
}

// #prod-FunctionDeclaration
export function isFunctionDeclaration(node) {
  return node.type === 'FunctionDeclaration'
         && !node.generator
         && !node.async;
}

// #prod-GeneratorDeclaration
export function isGeneratorDeclaration(node) {
  return node.type === 'FunctionDeclaration'
         && node.generator
         && !node.async;
}

// #prod-AsyncFunctionDeclaration
export function isAsyncFunctionDeclaration(node) {
  return node.type === 'FunctionDeclaration'
         && !node.generator
         && node.async;
}

// #prod-AsyncGeneratorDeclaration
export function isAsyncGeneratorDeclaration(node) {
  return node.type === 'FunctionDeclaration'
         && node.generator
         && node.async;
}

// #prod-ClassDeclaration
export function isClassDeclaration(node) {
  return node.type === 'ClassDeclaration';
}

// #prod-LexicalDeclaration
export function isLexicalDeclaration(node) {
  return node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const');
}

// #prod-ImportDeclaration
export function isImportDeclaration(node) {
  return node.type === 'ImportDeclaration';
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithStar(node) {
  return node.type === 'ExportAllDeclaration';
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithExportAndFrom(node) {
  return node.type === 'ExportNamedDeclaration'
    && node.declaration === null
    && node.source !== null;
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithExport(node) {
  return node.type === 'ExportNamedDeclaration'
         && node.declaration === null
         && node.source === null;
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithVariable(node) {
  return node.type === 'ExportNamedDeclaration'
         && node.declaration !== null
         && isVariableStatement(node.declaration);
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithDeclaration(node) {
  return node.type === 'ExportNamedDeclaration'
         && node.declaration !== null
         && isDeclaration(node.declaration);
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithDefaultAndHoistable(node) {
  return node.type === 'ExportDefaultDeclaration' && isHoistableDeclaration(node.declaration);
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithDefaultAndClass(node) {
  return node.type === 'ExportDefaultDeclaration' && isClassDeclaration(node.declaration);
}

// Used in #prod-ExportDeclaration
export function isExportDeclarationWithDefaultAndExpression(node) {
  return node.type === 'ExportDefaultDeclaration' && isAssignmentExpression(node.declaration);
}

// #prod-ExportDeclaration
export function isExportDeclaration(node) {
  return isExportDeclarationWithStar(node)
         || isExportDeclarationWithExportAndFrom(node)
         || isExportDeclarationWithExport(node)
         || isExportDeclarationWithVariable(node)
         || isExportDeclarationWithDeclaration(node)
         || isExportDeclarationWithDefaultAndHoistable(node)
         || isExportDeclarationWithDefaultAndClass(node)
         || isExportDeclarationWithDefaultAndExpression(node);
}
