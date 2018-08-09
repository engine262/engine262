import {
  NormalCompletion,
  UpdateEmpty,
  Q, X,
  ReturnIfAbrupt,
} from './completion.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import {
  isExpressionStatement,
  isMemberExpressionWithBrackets,
  isMemberExpressionWithDot,
  isCallExpressionWithBrackets,
  isCallExpressionWithDot,
} from './ast.mjs';
import {
  Type,
  Reference,
  PrimitiveValue,
  UndefinedValue,
  NullValue,
  ObjectValue,
  New as NewValue,
} from './value.mjs';
import {
  Assert,
  ToPropertyKey,
  RequireObjectCoercible,
  ToObject,
} from './abstract-ops/all.mjs';

function GetBase(V) {
  Assert(Type(V) === 'Reference');
  return V.BaseValue;
}

function IsUnresolableReference(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue instanceof UndefinedValue) {
    return true;
  }
  return false;
}

function HasPrimitiveBase(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue instanceof PrimitiveValue) {
    return true;
  }
  return false;
}

function IsPropertyReference(V) {
  Assert(Type(V) === 'Reference');
  if (V.BaseValue instanceof ObjectValue || HasPrimitiveBase(V)) {
    return true;
  }
  return false;
}

function GetReferencedName(V) {
  Assert(Type(V) === 'Reference');
  return V.ReferencedName;
}

function IsSuperReference(V) {
  Assert(Type(V) === 'Reference');
  return 'ThisValue' in V;
}

function GetThisValue(V) {
  Assert(IsPropertyReference(V));
  if (IsSuperReference(V)) {
    return V.ThisValue;
  }
  return GetBase(V);
}

function IsStrictReference(V) {
  Assert(Type(V) === 'Reference');
  return V.StrictReference;
}

function GetValue(V) {
  ReturnIfAbrupt(V);
  if (Type(V) !== 'Reference') {
    return V;
  }
  let base = GetBase(V);
  if (IsUnresolableReference(V)) {
    return surroundingAgent.Throw('ReferenceError');
  }
  if (IsPropertyReference(V)) {
    if (HasPrimitiveBase(V)) {
      Assert(!(base instanceof UndefinedValue || base instanceof NullValue));
      base = X(ToObject(base));
    }
    return base.Get(GetReferencedName(V), GetThisValue(V));
  } else {
    return base.GetBindingValue(GetReferencedName(V), IsStrictReference(V));
  }
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression [ Expression ]
//   CallExpression : CallExpression [ Expression ]
function MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = EvaluateExpression(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = EvaluateExpression(Expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = ToPropertyKey(propertyNameValue);
  const strict = true;
  return new Reference(bv, propertyKey, strict);
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression . IdentifierName
//   CallExpression : CallExpression . CallExpression
function MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = EvaluateExpression(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = NewValue(IdentifierName.name);
  const strict = true;
  return new Reference(bv, propertyNameString, strict);
}

function Evaluate_MemberExpression(MemberExpression) {
  if (isMemberExpressionWithBrackets(MemberExpression)) {
    return MemberExpression_Expression(MemberExpression.object, MemberExpression.property);
  }
  if (isMemberExpressionWithDot(MemberExpression)) {
    return MemberExpression_IdentifierName(MemberExpression.object, MemberExpression.property);
  }
}

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
function EvaluateStatementList(StatementList, envRec) {
  const sl = EvaluateStatementListItem(StatementList[0]);
  ReturnIfAbrupt(sl);
  if (StatementList.length === 1) {
    return sl;
  }
  let s;
  for (const StatementListItem of StatementList.slice(1)) {
    s = EvaluateStatementListItem(StatementListItem);
  }
  // return UpdateEmpty(s, sl);
  return s;
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
  return GetValue(exprRef);
}

// (implicit)
//   Expression : NullLiteral
//   Expression : BooleanLiteral
//   Expression : NumbericLiteral
//   Expression : StringLiteral
function EvaluateExpression(Expression, envRec) {
  if (Expression.type === 'Literal'
      && (
        Expression.value === null
        || typeof Expression.value === 'boolean'
        || typeof Expression.value === 'number'
        || typeof Expression.value === 'string')) {
    return NewValue(Expression.value);
  }

  switch (true) {
    case isMemberExpressionWithBrackets(Expression):
    case isMemberExpressionWithDot(Expression):
      return Evaluate_MemberExpression(Expression);

    default:
      throw new RangeError('EvaluateExpression unknown expression type');
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
