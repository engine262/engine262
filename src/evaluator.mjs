import {
  NormalCompletion,
  AbruptCompletion,
  UpdateEmpty,
} from './completions.mjs';

import {
  isExpressionStatement,
} from './ast.mjs';

import {
  New as NewValue,
} from './value.mjs';

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
function EvaluateStatementList(StatementList, envRec) {
  let sl = EvaluateStatementListItem(StatementList[0]);
  if (StatementList.length === 1) {
    return sl;
  }
  let s;
  for (const StatementListItem of StatementList.slice(1)) {
    try {
      s = EvaluateStatementListItem(StatementListItem);
    } catch (err) {
      s = err;
    }
    sl = UpdateEmpty(s, sl.Value);
    if (sl instanceof AbruptCompletion) {
      throw sl;
    }
  }
  return sl;
}

// (implicit)
//   StatementListItem : Statement
//   Statement : ExpressionStatement
function EvaluateStatementListItem(StatementListItem, envRec) {
  if (isExpressionStatement(StatementListItem)) {
    return EvaluateExpressionStatement(StatementListItem, envRec);
  }
}

// #sec-expression-statement-runtime-semantics-evaluation
//   ExpressionStatement : Expression `;`
function EvaluateExpressionStatement(ExpressionStatement, envRec) {
  const exprRef = EvaluateExpression(ExpressionStatement.expression, envRec);
  // return GetValue(exprRef);
  return exprRef;
}

// (implicit)
//   Expression : BooleanLiteral
function EvaluateExpression(Expression, envRec) {
  if (Expression.type === 'Literal' && typeof Expression.value === 'boolean') {
    return new NormalCompletion(NewValue(Expression.value));
  }
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
