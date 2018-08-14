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
  isExpression,
  isStatement,
  isExpressionStatement,
  isThrowStatement,
  isTryStatement,
  isTryStatementWithCatch,
  isTryStatementWithFinally,
  isBlockStatement,
  isNewExpression,
  isNewExpressionWithArguments,
  isNewExpressionWithoutArguments,
  isMemberExpression,
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
  BoundNames_Declaration,
  LexicallyScopedDeclarations_StatementList,
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
  IsConstructor,
  Construct,
} from './abstract-ops/all.mjs';
import {
  LexicalEnvironment,
  NewDeclarativeEnvironment,
  DeclarativeEnvironmentRecord,
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
  const strict = surroundingAgent.isStrictCode;
  return GetIdentifierReference(env, name, strict);
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression [ Expression ]
//   CallExpression : CallExpression [ Expression ]
function MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = Evaluate(Expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = ToPropertyKey(propertyNameValue);
  const strict = surroundingAgent.isStrictCode;
  return new Reference(bv, propertyKey, strict);
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression . IdentifierName
//   CallExpression : CallExpression . CallExpression
function MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = NewValue(IdentifierName.name);
  const strict = true;
  return new Reference(bv, propertyNameString, strict);
}

// #prod-AdditiveExpression
//    AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function AdditiveExpression_MultiplicativeExpression(AdditiveExpression, MultiplicativeExpression) {
  const lref = Evaluate(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate(MultiplicativeExpression);
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
  const lref = Evaluate(SubtractiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate(MultiplicativeExpression);
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

function IsInTailPosition() {
  return false;
}

// #sec-argument-lists-runtime-semantics-argumentlistevaluation
function ArgumentListEvaluation(ArgumentList) {
  // Arguments : ( )
  if (ArgumentList.length === 0) {
    return [];
  }

  // ArgumentList : ArgumentList , AssignmentExpression
  let preceedingArgs = ArgumentListEvaluation(ArgumentList.slice(0, -1));
  ReturnIfAbrupt(preceedingArgs);
  const ref = Evaluate(ArgumentList[ArgumentList.length - 1]);
  const arg = Q(GetValue(ref));
  preceedingArgs.push(arg);
  return preceedingArgs;
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
  let argList = ArgumentListEvaluation(args);
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
  const ref = Evaluate(CallExpression);
  const func = Q(GetValue(ref));
  const thisCall = undefined;
  const tailCall = IsInTailPosition(thisCall);
  return Q(EvaluateCall(func, ref, Arguments, tailCall));
}

//  ThrowStatement : throw Expression ;
function EvaluateThrowStatement(Expression) {
  const exprRef = Evaluate(Expression);
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
  const B = Evaluate(Block);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return B;
}

function EvaluateTryStatement_Catch(Block, Catch) {
  const B = Evaluate(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  return UpdateEmpty(C, NewValue(undefined));
}

function EvaluateTryStatement_Finally(Block, Finally) {
  const B = Evaluate(Block);
  let F = Evaluate(Finally);
  if (F.Type === 'normal') {
    F = B;
  }
  return UpdateEmpty(F, NewValue(undefined));
}

function EvaluateTryStatement_CatchFinally(Block, Catch, Finally) {
  const B = Evaluate(Block);
  let C;
  if (B.Type === 'throw') {
    C = CatchClauseEvaluation(Catch, B.Value);
  } else {
    C = B;
  }
  let F = Evaluate(Finally);
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

// #sec-new-operator-runtime-semantics-evaluation
// NewExpression :
//   new NewExpression
//   new MemberExpression Arguments
function Evaluate_NewExpression(NewExpression) {
  switch (true) {
    case isNewExpressionWithoutArguments(NewExpression):
      return EvaluateNew(NewExpression.callee, undefined);
    case isNewExpressionWithArguments(NewExpression):
      return EvaluateNew(NewExpression.callee, NewExpression.arguments);

    default:
      throw new RangeError();
  }
}

// #sec-evaluatenew
function EvaluateNew(constructExpr, args) {
  Assert(isNewExpression(constructExpr) || isMemberExpression(constructExpr));
  Assert(args === undefined || Array.isArray(args));
  const ref = Evaluate(constructExpr);
  const constructor = Q(GetValue(ref));
  let argList;
  if (args === undefined) {
    argList = [];
  } else {
    argList = ArgumentListEvaluation(args);
    ReturnIfAbrupt(argList);
  }
  if (IsConstructor(constructor).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(Construct(constructor, argList));
}

// #sec-block-runtime-semantics-evaluation
// Block :
//   { }
//   { StatementList }
function Evaluate_BlockStatement(BlockStatement) {
  const StatementList = BlockStatement.body;

  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(StatementList, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const blockValue = EvaluateStatementList(StatementList);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return blockValue;
}

// #sec-blockdeclarationinstantiation
function BlockDeclarationInstantiation(code, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof DeclarativeEnvironmentRecord);
  const declarations = LexicallyScopedDeclarations_StatementList(code);
  for (const d of declarations) {
    for (const dn of BoundNames_Declaration(d)) {
      // If IsConstantDeclaration of d is true, then
      //   Perform ! envRec.CreateImmutableBinding(dn, true).
      // Else,
      //   Perform ! envRec.CreateMutableBinding(dn, false).
      // If d is a FunctionDeclaration, a GeneratorDeclaration,
      // an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration, then
      //   Let fn be the sole element of the BoundNames of d.
      //   Let fo be the result of performing InstantiateFunctionObject for d with argument env.
      //   Perform envRec.InitializeBinding(fn, fo).
    }
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
      return Evaluate_BlockStatement(StatementListItem);
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
    case isNewExpression(Expression):
      return Evaluate_NewExpression(Expression);

    default:
      console.log(Expression);
      throw new RangeError('EvaluateExpression unknown expression type');
  }
}

function Evaluate(node) {
  if (isExpression(node)) {
    surroundingAgent.nodeStack.push(node);
    const r = EvaluateExpression(node);
    surroundingAgent.nodeStack.pop();
    return r;
  } else if (isStatement(node)) {
    surroundingAgent.nodeStack.push(node);
    const r = EvaluateStatement(node);
    surroundingAgent.nodeStack.pop();
    return r;
  }
  console.log(node);
  throw new RangeError();
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
