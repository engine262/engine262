import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  Value,
  New as NewValue,
} from '../value.mjs';
import {
  Assert,
  IsCallable,
  PrepareForTailCall,
  Call,
  IsPropertyReference,
  GetThisValue,
  GetBase,
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  ArgumentListEvaluation,
  Evaluate_MemberExpression_IdentifierName,
  Evaluate_MemberExpression_Expression,
} from './all.mjs';
import {
  isCallExpressionWithBrackets,
  isCallExpressionWithDot,
  isCallExpressionWithTaggedTemplate,
  isCallExpressionWithCall,
  isCallExpression,
} from '../ast.mjs';
import {
  Q,
  ReturnIfAbrupt,
  AbruptCompletion,
} from '../completion.mjs';
import {
  Evaluate,
} from '../evaluator.mjs';


function IsInTailPosition() {
  return false;
}

function EvaluateCall(func, ref, args, tailPosition) {
  let thisValue;
  if (Type(ref) === 'Reference') {
    if (IsPropertyReference(ref).isTrue()) {
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
    PrepareForTailCall();
  }
  const result = Call(func, thisValue, argList);
  // Assert: If tailPosition is true, the above call will not return here
  // but instead evaluation will continue as if the following return has already occurred.
  if (!(result instanceof AbruptCompletion)) {
    Assert(result instanceof Value);
  }
  return result;
}

function Evaluate_CallExpression_Arguments(CallExpression, Arguments) {
  const ref = Evaluate(CallExpression);
  const func = Q(GetValue(ref));
  const thisCall = undefined;
  const tailCall = IsInTailPosition(thisCall);
  return Q(EvaluateCall(func, ref, Arguments, tailCall));
}

// #sec-function-calls-runtime-semantics-evaluation
// CallExpression :
//   CallExpression : CallExpression Arguments
//   CallExpression : CallExpression [ Expression ]
//   CallExpression : CallExpression . IdentifierName
export function Evaluate_CallExpression(CallExpression) {
  switch (true) {
    case isCallExpressionWithBrackets(CallExpression):
      return Evaluate_MemberExpression_Expression(CallExpression.object, CallExpression.property);
    case isCallExpressionWithDot(CallExpression):
      return Evaluate_MemberExpression_IdentifierName(
        CallExpression.object, CallExpression.property,
      );
    case isCallExpressionWithTaggedTemplate(CallExpression):
    case isCallExpressionWithCall(CallExpression):
      throw new RangeError();
    case isCallExpression(CallExpression):
      return Evaluate_CallExpression_Arguments(CallExpression.callee, CallExpression.arguments);

    default:
      throw new RangeError();
  }
}
