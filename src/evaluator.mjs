import {
  NormalCompletion,
  UpdateEmpty,
  ReturnIfAbrupt,
} from './completion.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import {
  isExpression,
  isStatement,
  isExpressionStatement,
  isThrowStatement,
  isTryStatement,
  isBlockStatement,
  isNewExpression,
  isMemberExpression,
  isCallExpression,
  isActualAdditiveExpression,
  isActualMultiplicativeExpression,
  isIdentifierReference,
  isPrimaryExpressionWithThis,
  isFunctionDeclaration,
  isLexicalDeclaration,
  isLexicalBinding,
  isAssignmentExpression,
} from './ast.mjs';
import {
  Evaluate_AssignmentExpression,
  Evaluate_TryStatement,
  Evaluate_CallExpression,
  Evaluate_ThrowStatement,
  Evaluate_ThisExpression,
  Evaluate_NewExpression,
  Evaluate_LexicalDeclaration,
  Evaluate_LexicalBinding,
  Evaluate_FunctionDeclaration,
  Evaluate_BlockStatement,
  Evaluate_Identifier,
  Evaluate_AdditiveExpression,
  Evaluate_MultiplicativeExpression,
  Evaluate_MemberExpression,
} from './runtime-semantics/all.mjs';
import {
  New as NewValue,
  Value,
  Reference,
} from './value.mjs';
import {
  GetValue,
} from './abstract-ops/all.mjs';

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
function EvaluateStatementList(StatementList) {
  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const StatementListItem = StatementList.shift();

  let sl = EvaluateStatementListItem(StatementListItem);
  ReturnIfAbrupt(sl);
  const s = Evaluate(StatementList);
  return UpdateEmpty(s, sl);
}

// (implicit)
//   StatementListItem : Statement
//   Statement : ExpressionStatement
function EvaluateStatementListItem(StatementListItem) {
  surroundingAgent.nodeStack.push(StatementListItem);
  try {
    switch (true) {
      case isBlockStatement(StatementListItem):
        return Evaluate_BlockStatement(StatementListItem);
      case isExpressionStatement(StatementListItem):
        return Evaluate_ExpressionStatement(StatementListItem);
      case isThrowStatement(StatementListItem):
        return Evaluate_ThrowStatement(StatementListItem.argument);
      case isTryStatement(StatementListItem):
        return Evaluate_TryStatement(StatementListItem);
      case isFunctionDeclaration(StatementListItem):
        return Evaluate_FunctionDeclaration(StatementListItem);
      case isLexicalDeclaration(StatementListItem):
        return Evaluate_LexicalDeclaration(StatementListItem);
      case isLexicalBinding(StatementListItem):
        return Evaluate_LexicalBinding(StatementListItem);

      default:
        console.error(StatementListItem); // eslint-disable-line no-console
        throw new RangeError('unknown StatementListItem type');
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

function EvaluateStatement(...args) {
  return EvaluateStatementListItem(...args);
}

// #sec-expression-statement-runtime-semantics-evaluation
//   ExpressionStatement : Expression `;`
function Evaluate_ExpressionStatement(ExpressionStatement) {
  const exprRef = EvaluateExpression(ExpressionStatement.expression);
  return GetValue(exprRef);
}

// (implicit)
//   Expression : NullLiteral
//   Expression : BooleanLiteral
//   Expression : NumbericLiteral
//   Expression : StringLiteral
function EvaluateExpression(Expression) {
  surroundingAgent.nodeStack.push(Expression);
  try {
    if (Expression.type === 'Literal'
        && (
          Expression.value === null
          || typeof Expression.value === 'boolean'
          || typeof Expression.value === 'number'
          || typeof Expression.value === 'string')) {
      return NewValue(Expression.value);
    }

    switch (true) {
      case isIdentifierReference(Expression):
        return Evaluate_Identifier(Expression);
      case isMemberExpression(Expression):
        return Evaluate_MemberExpression(Expression);
      case isCallExpression(Expression):
        return Evaluate_CallExpression(Expression);
      case isActualAdditiveExpression(Expression):
        return Evaluate_AdditiveExpression(Expression);
      case isActualMultiplicativeExpression(Expression):
        return Evaluate_MultiplicativeExpression(Expression);
      case isPrimaryExpressionWithThis(Expression):
        return Evaluate_ThisExpression(Expression);
      case isNewExpression(Expression):
        return Evaluate_NewExpression(Expression);
      case isAssignmentExpression(Expression):
        return Evaluate_AssignmentExpression(Expression);

      default:
        console.error(Expression); // eslint-disable-line no-console
        throw new RangeError('EvaluateExpression unknown expression type');
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

export function Evaluate(node) {
  if (node instanceof Value || node instanceof Reference) {
    return node;
  }

  if (Array.isArray(node)) {
    return EvaluateStatementList(node);
  }

  if (isExpression(node)) {
    return EvaluateExpression(node);
  }

  if (isStatement(node)) {
    return EvaluateStatement(node);
  }
  console.error(node); // eslint-disable-line no-console
  throw new RangeError('unknown node type');
}

// #sec-script-semantics-runtime-semantics-evaluation
//   Script : [empty]
//
// (implicit)
//   Script : ScriptBody
//   ScriptBody : StatementList
export function EvaluateScript(Script, envRec) {
  if (Script.length === 0) {
    return new NormalCompletion();
  }
  return EvaluateStatementList(Script, envRec);
}
