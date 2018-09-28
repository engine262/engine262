import { surroundingAgent } from '../engine.mjs';
import {
  isUnaryExpressionWithDelete,
  isUnaryExpressionWithVoid,
  isUnaryExpressionWithTypeof,
  isUnaryExpressionWithPlus,
  isUnaryExpressionWithMinus,
  isUnaryExpressionWithTilde,
  isUnaryExpressionWithBang,
} from '../ast.mjs';
import {
  Assert,
  GetBase,
  GetReferencedName,
  GetValue,
  IsCallable,
  IsUnresolvableReference,
  IsStrictReference,
  IsSuperReference,
  IsPropertyReference,
  ToBoolean,
  ToNumber,
  ToObject,
  ToInt32,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q, X, ReturnIfAbrupt } from '../completion.mjs';
import { New as NewValue, Type } from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-delete-operator-runtime-semantics-evaluation
// UnaryExpression : `delete` UnaryExpression
function* Evaluate_UnaryExpression_Delete(UnaryExpression) {
  const ref = yield* Evaluate_Expression(UnaryExpression);
  ReturnIfAbrupt(ref);
  if (Type(ref) !== 'Reference') {
    return NewValue(true);
  }
  if (IsUnresolvableReference(ref).isTrue()) {
    Assert(IsStrictReference(ref).isFalse());
    return NewValue(false);
  }
  if (IsPropertyReference(ref).isTrue()) {
    if (IsSuperReference(ref).isTrue()) {
      return surroundingAgent.Throw('ReferenceError');
    }
    const baseObj = X(ToObject(GetBase(ref)));
    const deleteStatus = Q(baseObj.Delete(GetReferencedName(ref)));
    if (deleteStatus.isFalse() && IsStrictReference(ref).isTrue()) {
      return surroundingAgent.Throw('TypeError');
    }
    return deleteStatus;
  } else {
    const bindings = GetBase(ref);
    return Q(bindings.DeleteBinding(GetReferencedName(ref)));
  }
}

// #sec-void-operator-runtime-semantics-evaluation
// UnaryExpression : `void` UnaryExpression
function* Evaluate_UnaryExpression_Void(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  Q(GetValue(expr));
  return NewValue(undefined);
}

// #sec-typeof-operator-runtime-semantics-evaluation
// UnaryExpression : `typeof` UnaryExpression
function* Evaluate_UnaryExpression_Typeof(UnaryExpression) {
  let val = yield* Evaluate_Expression(UnaryExpression);
  if (Type(val) === 'Reference') {
    if (IsUnresolvableReference(val).isTrue()) {
      return NewValue('undefined');
    }
  }
  val = Q(GetValue(val));

  // Return a String according to Table 35.

  const type = Type(val);

  switch (type) {
    case 'Undefined':
      return NewValue('undefined');
    case 'Null':
      return NewValue('object');
    case 'Boolean':
      return NewValue('boolean');
    case 'Number':
      return NewValue('number');
    case 'String':
      return NewValue('string');
    case 'Symbol':
      return NewValue('symbol');
    case 'Object':
      if (IsCallable(val).isTrue()) {
        return NewValue('function');
      }
      return NewValue('object');

    default:
      throw outOfRange('Evaluate_UnaryExpression_Typeof', type);
  }
}

// #sec-unary-plus-operator-runtime-semantics-evaluation
// UnaryExpression : `+` UnaryExpression
function* Evaluate_UnaryExpression_Plus(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  const exprVal = Q(GetValue(expr));
  return Q(ToNumber(exprVal));
}

// #sec-unary-minus-operator-runtime-semantics-evaluation
// UnaryExpression : `-` UnaryExpression
function* Evaluate_UnaryExpression_Minus(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  const exprVal = Q(GetValue(expr));
  const oldValue = Q(ToNumber(exprVal));
  if (oldValue.isNaN()) {
    return NewValue(NaN);
  }
  return NewValue(-oldValue.numberValue());
}

// #sec-bitwise-not-operator-runtime-semantics-evaluation
// UnaryExpression : `~` UnaryExpression
function* Evaluate_UnaryExpression_Tilde(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  const exprVal = Q(GetValue(expr));
  const oldValue = Q(ToInt32(exprVal));
  return NewValue(~oldValue.numberValue()); // eslint-disable-line no-bitwise
}

// #sec-logical-not-operator-runtime-semantics-evaluation
// UnaryExpression : `!` UnaryExpression
function* Evaluate_UnaryExpression_Bang(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  const oldValue = ToBoolean(Q(GetValue(expr)));
  if (oldValue.isTrue()) {
    return NewValue(false);
  }
  return NewValue(true);
}

export function* Evaluate_UnaryExpression(UnaryExpression) {
  switch (true) {
    case isUnaryExpressionWithDelete(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Delete(UnaryExpression.argument);
    case isUnaryExpressionWithVoid(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Void(UnaryExpression.argument);
    case isUnaryExpressionWithTypeof(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Typeof(UnaryExpression.argument);
    case isUnaryExpressionWithPlus(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Plus(UnaryExpression.argument);
    case isUnaryExpressionWithMinus(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Minus(UnaryExpression.argument);
    case isUnaryExpressionWithTilde(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Tilde(UnaryExpression.argument);
    case isUnaryExpressionWithBang(UnaryExpression):
      return yield* Evaluate_UnaryExpression_Bang(UnaryExpression.argument);

    default:
      throw outOfRange('Evaluate_UnaryExpression', UnaryExpression);
  }
}
