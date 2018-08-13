import {
  NormalCompletion,
  AbruptCompletion,
  ThrowCompletion,
  UpdateEmpty,
  Q, X,
  ReturnIfAbrupt,
} from './completion.mjs';
import {
  surroundingAgent,
  ResolveThisBinding,
  GetGlobalObject,
} from './engine.mjs';
import {
  isExpressionStatement,
  isThrowStatement,
  isTryStatement,
  isTryStatementWithCatch,
  isTryStatementWithFinally,
  isBlockStatement,
  isMemberExpressionWithBrackets,
  isMemberExpressionWithDot,
  isCallExpressionWithBrackets,
  isCallExpressionWithDot,
  isActualAdditiveExpression,
  isAdditiveExpressionWithPlus,
  isAdditiveExpressionWithMinus,
  isIdentifierReference,
  isCallExpression,
  isPrimaryExpressionWithThis,
} from './ast.mjs';
import {
  BoundNames_CatchParameter,
} from './static-semantics/all.mjs';
import {
  BindingInitialization,
} from './runtime-semantics/all.mjs';
import {
  Type,
  Reference,
  Value,
  PrimitiveValue,
  New as NewValue,
} from './value.mjs';
import {
  Assert,
  ToPropertyKey,
  RequireObjectCoercible,
  ToObject,
  ToPrimitive,
  ToString,
  ToNumber,
  IsCallable,
  Call,
} from './abstract-ops/all.mjs';
import {
  LexicalEnvironment,
  NewDeclarativeEnvironment,
} from './environment.mjs';

export function GetBase(V) {
  Assert(Type(V) === 'Reference');
  return V.BaseValue;
}

export function IsUnresolvableReference(V) {
  Assert(Type(V) === 'Reference');
  if (Type(V.BaseValue) === 'Undefined') {
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
  if (Type(V.BaseValue) === 'Object' || HasPrimitiveBase(V)) {
    return true;
  }
  return false;
}

export function GetReferencedName(V) {
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

// #sec-isstrictreference
function IsStrictReference(V) {
  Assert(Type(V) === 'Reference');
  return V.StrictReference;
}

// #sec-getvalue
function GetValue(V) {
  ReturnIfAbrupt(V);
  if (Type(V) !== 'Reference') {
    return V;
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V)) {
    return surroundingAgent.Throw('ReferenceError');
  }
  if (IsPropertyReference(V)) {
    if (HasPrimitiveBase(V)) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    return base.Get(GetReferencedName(V), GetThisValue(V));
  } else {
    return base.GetBindingValue(GetReferencedName(V), IsStrictReference(V));
  }
}

// #sec-putvalue
export function PutValue(V, W) {
  ReturnIfAbrupt(V);
  ReturnIfAbrupt(W);
  if (Type(V) !== 'Reference') {
    return surroundingAgent.Throw('ReferenceError');
  }
  let base = GetBase(V);
  if (IsUnresolvableReference(V)) {
    if (IsStrictReference(V)) {
      return surroundingAgent.Throw('ReferenceError');
    }
    const globalObj = GetGlobalObject();
    return Q(Set(globalObj, GetReferencedName(V), W, NewValue(false)));
  } else if (IsPropertyReference(V)) {
    if (HasPrimitiveBase(V)) {
      Assert(Type(base) !== 'Undefined' && Type(base) !== 'Null');
      base = X(ToObject(base));
    }
    const succeeded = Q(base.Set(GetReferencedName(V), W, GetThisValue(V)));
    if (succeeded.isFalse() && IsStrictReference(V)) {
      return surroundingAgent.Throw('TypeError');
    }
    return new NormalCompletion(undefined);
  } else {
    return Q(base.SetMutableBinding(GetReferencedName(V), W, IsStrictReference(V)));
  }
}

function GetIdentifierReference(lex, name, strict) {
  if (Type(lex) === 'Null') {
    return new Reference(NewValue(undefined), name, strict);
  }
  const envRec = lex.EnvironmentRecord;
  const exists = envRec.HasBinding(name);
  if (exists) {
    return new Reference(envRec, name, strict);
  } else {
    const outer = lex.outerLexicalEnvironment;
    return GetIdentifierReference(outer, name, strict);
  }
}

export function ResolveBinding(name, env) {
  if (!env || Type(env) === 'Undefined') {
    env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  }
  Assert(env instanceof LexicalEnvironment);
  // If the code matching the syntactic production that is being evaluated
  // is contained in strict mode code, let strict be true, else let strict be false.
  const strict = true;
  return GetIdentifierReference(env, name, strict);
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

// #prod-AdditiveExpression
//    AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function AdditiveExpression_MultiplicativeExpression(AdditiveExpression, MultiplicativeExpression) {
  const lref = EvaluateExpression(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = EvaluateExpression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lprim = Q(ToPrimitive(lval));
  const rprim = Q(ToPrimitive(rval));
  if (Type(lprim) === 'String' || Type(rprim) === 'String') {
    const lstr = Q(ToString(lprim));
    const rstr = Q(ToString(rprim));
    return NewValue(lstr.stringValue() + rstr.stringValue());
  }
  const lnum = Q(ToNumber(lprim));
  const rnum = Q(ToNumber(rprim));
  return NewValue(lnum.numberValue() + rnum.numberValue());
}

function SubtractiveExpression_MultiplicativeExpression(
  SubtractiveExpression, MultiplicativeExpression,
) {
  const lref = EvaluateExpression(SubtractiveExpression);
  const lval = Q(GetValue(lref));
  const rref = EvaluateExpression(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));
  return NewValue(lnum.numberValue() + rnum.numberValue());
}

function Evaluate_AdditiveExpression(AdditiveExpression) {
  switch (true) {
    case isAdditiveExpressionWithPlus(AdditiveExpression):
      return AdditiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );
    case isAdditiveExpressionWithMinus(AdditiveExpression):
      return SubtractiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );

    default:
      throw new RangeError('Unknown AdditiveExpression type');
  }
}

function EvaluateExpression_Identifier(Identifier) {
  return Q(ResolveBinding(NewValue(Identifier.name)));
}

function IsInTailPosition(CallExpression) {
  return false;
}

function ArgumentListEvaluation(Arguments) {
  if (Arguments.length === 0) {
    return [];
  }
  // this is wrong
  return Arguments.map((Expression) => GetValue(EvaluateExpression(Expression)));
}

function EvaluateCall(func, ref, args, tailPosition) {
  let thisValue;
  if (Type(ref) === 'Reference') {
    if (IsPropertyReference(ref)) {
      thisValue = GetThisValue(ref);
    } else {
      const refEnv = GetBase(ref);
      thisValue = refEnv.WithBaseObject();
    }
  } else {
    thisValue = NewValue(undefined);
  }
  const argList = ArgumentListEvaluation(args);
  ReturnIfAbrupt(argList);
  if (Type(func) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(func).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  if (tailPosition) {
    // PrepareForTailCall();
  }
  const result = Call(func, thisValue, argList);
  // Assert: If tailPosition is true, the above call will not return here
  // but instead evaluation will continue as if the following return has already occurred.
  if (!(result instanceof AbruptCompletion)) {
    Assert(result instanceof Value);
  }
  return result;
}

function Evaluate_This() {
  return Q(ResolveThisBinding());
}

function Evalute_CallExpressionArguments(CallExpression, Arguments) {
  const ref = EvaluateExpression(CallExpression);
  const func = Q(GetValue(ref));
  const thisCall = undefined;
  const tailCall = IsInTailPosition(thisCall);
  return Q(EvaluateCall(func, ref, Arguments, tailCall));
}

//  ThrowStatement : throw Expression ;
function EvaluateThrowStatement(Expression) {
  const exprRef = EvaluateExpression(Expression);
  const exprValue = Q(GetValue(exprRef));
  return new ThrowCompletion(exprValue);
}

// #sec-runtime-semantics-catchclauseevaluation
//    Catch : catch ( CatchParameter ) Block
//    With parameter thrownValue.
function CatchClauseEvaluation(Catch, thrownValue) {
  const CatchParameter = Catch.param;
  const Block = Catch.body;
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const catchEnv = NewDeclarativeEnvironment(oldEnv);
  const catchEnvRec = catchEnv.EnvironmentRecord;
  for (const argName of BoundNames_CatchParameter(CatchParameter)) {
    X(catchEnvRec.CreateMutableBinding(NewValue(argName), false));
  }
  surroundingAgent.runningExecutionContext.LexicalEnvironment = catchEnv;
  const status = BindingInitialization(CatchParameter, thrownValue, catchEnv);
  if (status instanceof AbruptCompletion) {
    surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
    return status;
  }
  const B = EvaluateStatement(Block);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return B;
}

function EvaluateTryStatement_Catch(Block, Catch) {
  const B = EvaluateStatement(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  return UpdateEmpty(C, NewValue(undefined));
}

function EvaluateTryStatement_Finally(Block, Finally) {
  const B = EvaluateExpression(Block);
  let F = EvaluateExpression(Finally);
  if (F.Type === 'normal') {
    F = B;
  }
  return UpdateEmpty(F, NewValue(undefined));
}

function EvaluateTryStatement_CatchFinally(Block, Catch, Finally) {
  const B = EvaluateStatement(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  let F = EvaluateStatement(Finally);
  if (F.Type === 'normal') {
    F = C;
  }
  return UpdateEmpty(F, NewValue(undefined));
}

// #sec-try-statement-runtime-semantics-evaluation
function EvaluateTryStatement(Expression) {
  switch (true) {
    // TryStatement : try Block Catch Finally
    case isTryStatementWithCatch(Expression) && isTryStatementWithFinally(Expression):
      return EvaluateTryStatement_CatchFinally(
        Expression.block, Expression.handler, Expression.finalizer,
      );
    // TryStatement : try Block Catch
    case isTryStatementWithCatch(Expression):
      return EvaluateTryStatement_Catch(Expression.block, Expression.handler);
    // TryStatement : try Block Finally
    case isTryStatementWithFinally(Expression):
      return EvaluateTryStatement_Finally(Expression.block, Expression.finalizer);

    default:
      throw new RangeError('EvaluateTryStatement');
  }
}

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
function EvaluateStatementList(StatementList, envRec) {
  let sl = EvaluateStatementListItem(StatementList.shift());
  ReturnIfAbrupt(sl);
  if (StatementList.length === 0) {
    return new NormalCompletion(sl);
  }
  let s;
  for (const StatementListItem of StatementList) {
    s = EvaluateStatementListItem(StatementListItem);
  }
  return UpdateEmpty(s, sl);
}

// (implicit)
//   StatementListItem : Statement
//   Statement : ExpressionStatement
function EvaluateStatementListItem(StatementListItem, envRec) {
  switch (true) {
    case isBlockStatement(StatementListItem):
      return EvaluateStatementList(StatementListItem.body);
    case isExpressionStatement(StatementListItem):
      return EvaluateExpressionStatement(StatementListItem, envRec);
    case isThrowStatement(StatementListItem):
      return EvaluateThrowStatement(StatementListItem.argument);
    case isTryStatement(StatementListItem):
      return EvaluateTryStatement(StatementListItem);

    default:
      console.log(StatementListItem);
      throw new RangeError('unknown StatementListItem type');
  }
}
function EvaluateStatement(...args) {
  return EvaluateStatementListItem(...args);
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
    case isIdentifierReference(Expression):
      return EvaluateExpression_Identifier(Expression);
    case isMemberExpressionWithBrackets(Expression):
    case isCallExpressionWithBrackets(Expression): // identical semantics
      return MemberExpression_Expression(Expression.object, Expression.property);
    case isMemberExpressionWithDot(Expression):
    case isCallExpressionWithDot(Expression): // identical semantics
      return MemberExpression_IdentifierName(Expression.object, Expression.property);
    case isActualAdditiveExpression(Expression):
      return Evaluate_AdditiveExpression(Expression);
    case isCallExpression(Expression):
      return Evalute_CallExpressionArguments(Expression.callee, Expression.arguments);
    case isPrimaryExpressionWithThis(Expression):
      return Evaluate_This(Expression);

    default:
      console.log(Expression);
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
