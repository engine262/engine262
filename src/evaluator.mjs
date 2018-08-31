import {
  NormalCompletion,
  UpdateEmpty,
  ReturnIfAbrupt,
} from './completion.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import {
  isActualAdditiveExpression,
  isActualAssignmentExpression,
  isActualCallExpression,
  isActualEqualityExpression,
  isActualBitwiseANDExpression,
  isActualBitwiseXORExpression,
  isActualBitwiseORExpression,
  isActualExponentiationExpression,
  isActualMemberExpression,
  isActualMultiplicativeExpression,
  isActualNewExpression,
  isActualShiftExpression,
  isArrayLiteral,
  isBlockStatement,
  isExpressionStatement,
  isFunctionDeclaration,
  isIdentifierReference,
  isLexicalBinding,
  isLexicalDeclaration,
  isLiteral,
  isObjectLiteral,
  isTemplateLiteral,
  isThis,
  isThrowStatement,
  isTryStatement,
} from './ast.mjs';
import {
  EvaluateBinopValues_AdditiveExpression_Minus,
  EvaluateBinopValues_AdditiveExpression_Plus,
  EvaluateBinopValues_BitwiseANDExpression,
  EvaluateBinopValues_BitwiseXORExpression,
  EvaluateBinopValues_BitwiseORExpression,
  EvaluateBinopValues_ExponentiationExpression,
  EvaluateBinopValues_MultiplicativeExpression,
  EvaluateBinopValues_ShiftExpression,
  Evaluate_AdditiveExpression,
  Evaluate_ArrayLiteral,
  Evaluate_AssignmentExpression,
  Evaluate_BinaryBitwiseExpression,
  Evaluate_BlockStatement,
  Evaluate_CallExpression,
  Evaluate_EqualityExpression,
  Evaluate_ExponentiationExpression,
  Evaluate_FunctionDeclaration,
  Evaluate_Identifier,
  Evaluate_LexicalBinding,
  Evaluate_LexicalDeclaration,
  Evaluate_MemberExpression,
  Evaluate_MultiplicativeExpression,
  Evaluate_NewExpression,
  Evaluate_ObjectLiteral,
  Evaluate_ShiftExpression,
  Evaluate_TemplateLiteral,
  Evaluate_ThisExpression,
  Evaluate_ThrowStatement,
  Evaluate_TryStatement,
} from './runtime-semantics/all.mjs';
import {
  New as NewValue,
} from './value.mjs';
import {
  GetValue,
} from './abstract-ops/all.mjs';
import { outOfRange } from './helpers.mjs';

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function Evaluate_StatementList(StatementList) {
  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const StatementListItem = StatementList.shift();

  let sl = Evaluate_StatementListItem(StatementListItem);
  ReturnIfAbrupt(sl);
  const s = Evaluate_StatementList(StatementList);
  return UpdateEmpty(s, sl);
}

// (implicit)
//   StatementListItem : Statement
//   Statement : ExpressionStatement
function Evaluate_StatementListItem(StatementListItem) {
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
        throw outOfRange('Evaluate_StatementListItem', StatementListItem);
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

// #sec-expression-statement-runtime-semantics-evaluation
//   ExpressionStatement : Expression `;`
function Evaluate_ExpressionStatement(ExpressionStatement) {
  const exprRef = Evaluate_Expression(ExpressionStatement.expression);
  return GetValue(exprRef);
}

// #sec-literals-runtime-semantics-evaluation
//   Literal : NullLiteral
//   Literal : BooleanLiteral
//   Literal : NumbericLiteral
//   Literal : StringLiteral
function Evaluate_Literal(Literal) {
  return NewValue(Literal.value);
}

export function EvaluateBinopValues(operator, lval, rval) {
  switch (operator) {
    case '*':
    case '/':
    case '%':
      return EvaluateBinopValues_MultiplicativeExpression(operator, lval, rval);

    case '+':
      return EvaluateBinopValues_AdditiveExpression_Plus(lval, rval);

    case '-':
      return EvaluateBinopValues_AdditiveExpression_Minus(lval, rval);

    case '<<':
    case '>>':
    case '>>>':
      return EvaluateBinopValues_ShiftExpression(operator, lval, rval);

    case '&':
      return EvaluateBinopValues_BitwiseANDExpression(lval, rval);
    case '^':
      return EvaluateBinopValues_BitwiseXORExpression(lval, rval);
    case '|':
      return EvaluateBinopValues_BitwiseORExpression(lval, rval);

    case '**':
      return EvaluateBinopValues_ExponentiationExpression(lval, rval);

    default:
      throw outOfRange('EvaluateBinopValues', operator);
  }
}

// (implicit)
export function Evaluate_Expression(Expression) {
  surroundingAgent.nodeStack.push(Expression);
  try {
    switch (true) {
      case isThis(Expression):
        return Evaluate_ThisExpression(Expression);

      case isIdentifierReference(Expression):
        return Evaluate_Identifier(Expression);

      case isLiteral(Expression):
        return Evaluate_Literal(Expression);

      case isArrayLiteral(Expression):
        return Evaluate_ArrayLiteral(Expression);

      case isObjectLiteral(Expression):
        return Evaluate_ObjectLiteral(Expression);

        // case isFunctionExpression(Expression):
        //   return Evaluate_FunctionExpression(Expression);

        // case isClassExpression(Expression):
        //   return Evaluate_ClassExpression(Expression);

        // case isGeneratorExpression(Expression):
        //   return Evaluate_GeneratorExpression(Expression);

        // case isAsyncFunctionExpression(Expression):
        //   return Evaluate_AsyncFunctionExpression(Expression);

        // case isAsyncGeneratorExpression(Expression):
        //   return Evaluate_AsyncGeneratorExpression(Expression);

        // case isRegularExpressionLiteral(Expression):
        //   return Evaluate_RegularExpressionLiteral(Expression);

      case isTemplateLiteral(Expression):
        return Evaluate_TemplateLiteral(Expression);

      case isActualMemberExpression(Expression):
        return Evaluate_MemberExpression(Expression);

        // case isSuperProperty(Expression):
        //   return Evaluate_SuperProperty(Expression);

        // case isMetaProperty(Expression):
        //   return Evaluate_MetaProperty(Expression);

      case isActualNewExpression(Expression):
        return Evaluate_NewExpression(Expression);

      case isActualCallExpression(Expression):
        return Evaluate_CallExpression(Expression);

        // case isActualUpdateExpression(Expression):
        //   return Evaluate_UpdateExpression(Expression);

        // case isAwaitExpression(Expression):
        //   return Evaluate_AwaitExpression(Expression);

      case isActualExponentiationExpression(Expression):
        return Evaluate_ExponentiationExpression(Expression);

      case isActualMultiplicativeExpression(Expression):
        return Evaluate_MultiplicativeExpression(Expression);

      case isActualAdditiveExpression(Expression):
        return Evaluate_AdditiveExpression(Expression);

      case isActualShiftExpression(Expression):
        return Evaluate_ShiftExpression(Expression);

        // case isActualRelationalExpression(Expression):
        //   return Evaluate_RelationalExpression(Expression);

      case isActualEqualityExpression(Expression):
        return Evaluate_EqualityExpression(Expression);

      case isActualBitwiseANDExpression(Expression):
      case isActualBitwiseXORExpression(Expression):
      case isActualBitwiseORExpression(Expression):
        return Evaluate_BinaryBitwiseExpression(Expression);

        // case isActualLogicalANDExpression(Expression):
        //   return Evaluate_LogicalANDExpression(Expression);

        // case isActualLogicalORExpression(Expression):
        //   return Evaluate_LogicalORExpression(Expression);

        // case isActualConditionalExpression(Expression):
        //   return Evaluate_ConditionalExpression(Expression);

        // case isYieldExpression(Expression):
        //   return Evaluate_YieldExpression(Expression);

        // case isArrowFunction(Expression):
        //   return Evaluate_ArrowFunction(Expression);

        // case isAsyncArrowFunction(Expression):
        //   return Evaluate_AsyncArrowFunction(Expression);

      case isActualAssignmentExpression(Expression):
        return Evaluate_AssignmentExpression(Expression);

        // case isExpressionWithComma(Expression):
        //   return Evaluate_ExpressionWithComma(Expression);

      default:
        throw outOfRange('Evaluate_Expression', Expression);
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

// #sec-script-semantics-runtime-semantics-evaluation
//   Script : [empty]
//
// (implicit)
//   Script : ScriptBody
//   ScriptBody : StatementList
export function Evaluate_Script(Script, envRec) {
  if (Script.length === 0) {
    return new NormalCompletion();
  }
  return Evaluate_StatementList(Script, envRec);
}
