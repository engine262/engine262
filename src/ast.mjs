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

export function isSpreadElement(node) {
  return node.type === 'SpreadElement';
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

// #prod-IdentifierName
export const isIdentifierName = isIdentifier;

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

// Used in #prod-MemberExpression and #prod-CallExpression
export function isActualMemberExpression(node) {
  return node.type === 'MemberExpression' && node.object.type !== 'Super';
}

// Used in #prod-MemberExpression and #prod-CallExpression
export function isActualMemberExpressionWithBrackets(node) {
  return isActualMemberExpression(node) && node.computed;
}

// Used in #prod-MemberExpression and #prod-CallExpression
export function isActualMemberExpressionWithDot(node) {
  return isActualMemberExpression(node) && !node.computed;
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

// Used in #prod-MemberExpression and #prod-NewExpression
export function isActualNewExpression(node) {
  return node.type === 'NewExpression';
}

// Used in #prod-CallExpression and #prod-CallMemberExpression
export function isActualCallExpression(node) {
  return node.type === 'CallExpression' && node.callee.type !== 'Super';
}

// #prod-SuperCall
export function isSuperCall(node) {
  return node.type === 'CallExpression' && node.callee.type === 'Super';
}

// Used in #prod-UpdateExpression
export function isActualUpdateExpression(node) {
  return node.type === 'UpdateExpression';
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

// Used in #prod-ExponentiationExpression
export function isActualExponentiationExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '**';
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

// Used in #prod-AdditiveExpression
export function isActualAdditiveExpression(node) {
  return node.type === 'BinaryExpression'
         && (node.operator === '+' || node.operator === '-');
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

// Used in #prod-BitwiseANDExpression
export function isActualBitwiseANDExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '&';
}

// Used in #prod-BitwiseXORExpression
export function isActualBitwiseXORExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '^';
}

// Used in #prod-BitwiseORExpression
export function isActualBitwiseORExpression(node) {
  return node.type === 'BinaryExpression' && node.operator === '|';
}

// Used in #prod-LogicalANDExpression
export function isActualLogicalANDExpression(node) {
  return node.type === 'LogicalExpression' && node.operator === '&&';
}

// Used in #prod-LogicalORExpression
export function isActualLogicalORExpression(node) {
  return node.type === 'LogicalExpression' && node.operator === '||';
}

// Used in #prod-ConditionalExpression
export function isActualConditionalExpression(node) {
  return node.type === 'ConditionalExpression';
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

// Used in #prod-Expression
export function isExpressionWithComma(node) {
  return node.type === 'SequenceExpression';
}

// #prod-Expression
export function isExpression(node) {
  return (
    // PrimaryExpression except CoverParenthesizedExpressionAndArrowParameterList
    isThis(node)
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
      || isTemplateLiteral(node)

    // LeftHandSideExpression (including MemberExpression, NewExpression, and
    // CallExpression)
      || isActualMemberExpression(node)
      || isSuperProperty(node)
      || isMetaProperty(node)
      || isActualNewExpression(node)
      || isActualCallExpression(node)

    // UpdateExpression
      || isActualUpdateExpression(node)

    // UnaryExpression
      || isActualUnaryExpression(node)
      || isAwaitExpression(node)

    // ExponentiationExpression
      || isActualExponentiationExpression(node)

    // MultiplicativeExpression
      || isActualMultiplicativeExpression(node)

    // AdditiveExpression
      || isActualAdditiveExpression(node)

    // ShiftExpression
      || isActualShiftExpression(node)

    // RelationalExpression
      || isActualRelationalExpression(node)

    // EqualityExpression
      || isActualEqualityExpression(node)

    // BitwiseANDExpression
      || isActualBitwiseANDExpression(node)

    // BitwiseXORExpression
      || isActualBitwiseXORExpression(node)

    // BitwiseORExpression
      || isActualBitwiseORExpression(node)

    // LogicalANDExpression
      || isActualLogicalANDExpression(node)

    // LogicalORExpression
      || isActualLogicalORExpression(node)

    // ConditionalExpression
      || isActualConditionalExpression(node)

    // AssignmentExpression
      || isYieldExpression(node)
      || isArrowFunction(node)
      || isAsyncArrowFunction(node)
      || isActualAssignmentExpression(node)

    // Expression
      || isExpressionWithComma(node)
  );
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

export function isVariableDeclaration(node) {
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
  return node.type === 'DoWhileStatement'
         || node.type === 'WhileStatement'
         || node.type === 'ForStatement'
         || node.type === 'ForInStatement'
         || node.type === 'ForOfStatement';
}

export function isForBinding() {
  return false;
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

// #prod-LexicalBinding
export function isLexicalBinding(node) {
  return node.type === 'VariableDeclarator';
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
  return node.type === 'ExportDefaultDeclaration' && isExpression(node.declaration);
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
