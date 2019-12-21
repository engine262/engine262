import { surroundingAgent } from '../engine.mjs';
import {
  isUnaryExpressionWithBang,
  isUnaryExpressionWithDelete,
  isUnaryExpressionWithMinus,
  isUnaryExpressionWithPlus,
  isUnaryExpressionWithTilde,
  isUnaryExpressionWithTypeof,
  isUnaryExpressionWithVoid,
} from '../ast.mjs';
import {
  Assert,
  GetBase,
  GetReferencedName,
  GetValue,
  IsCallable,
  IsPropertyReference,
  IsStrictReference,
  IsSuperReference,
  IsUnresolvableReference,
  ToBoolean,
  ToNumber,
  ToObject,
  ToNumeric,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q, ReturnIfAbrupt, X } from '../completion.mjs';
import { Type, TypeNumeric, Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.5.3.2 #sec-delete-operator-runtime-semantics-evaluation
// UnaryExpression : `delete` UnaryExpression
function* Evaluate_UnaryExpression_Delete(UnaryExpression) {
  const ref = yield* Evaluate(UnaryExpression);
  ReturnIfAbrupt(ref);
  if (Type(ref) !== 'Reference') {
    return Value.true;
  }
  if (IsUnresolvableReference(ref) === Value.true) {
    Assert(IsStrictReference(ref) === Value.false);
    return Value.true;
  }
  if (IsPropertyReference(ref) === Value.true) {
    if (IsSuperReference(ref) === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'CannotDeleteSuper');
    }
    const baseObj = X(ToObject(GetBase(ref)));
    const deleteStatus = Q(baseObj.Delete(GetReferencedName(ref)));
    if (deleteStatus === Value.false && IsStrictReference(ref) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'StrictModeDelete', GetReferencedName(ref));
    }
    return deleteStatus;
  } else {
    const bindings = GetBase(ref);
    return Q(bindings.DeleteBinding(GetReferencedName(ref)));
  }
}

// 12.5.4.1 #sec-void-operator-runtime-semantics-evaluation
// UnaryExpression : `void` UnaryExpression
function* Evaluate_UnaryExpression_Void(UnaryExpression) {
  const expr = yield* Evaluate(UnaryExpression);
  Q(GetValue(expr));
  return Value.undefined;
}

// 12.5.5.1 #sec-typeof-operator-runtime-semantics-evaluation
// UnaryExpression : `typeof` UnaryExpression
function* Evaluate_UnaryExpression_Typeof(UnaryExpression) {
  let val = yield* Evaluate(UnaryExpression);
  if (Type(val) === 'Reference') {
    if (IsUnresolvableReference(val) === Value.true) {
      return new Value('undefined');
    }
  }
  val = Q(GetValue(val));

  // Return a String according to Table 37.

  const type = Type(val);

  switch (type) {
    case 'Undefined':
      return new Value('undefined');
    case 'Null':
      return new Value('object');
    case 'Boolean':
      return new Value('boolean');
    case 'Number':
      return new Value('number');
    case 'String':
      return new Value('string');
    case 'BigInt':
      return new Value('bigint');
    case 'Symbol':
      return new Value('symbol');
    case 'Object':
      if (IsCallable(val) === Value.true) {
        return new Value('function');
      }
      return new Value('object');

    default:
      throw new OutOfRange('Evaluate_UnaryExpression_Typeof', type);
  }
}

// 12.5.6.1 #sec-unary-plus-operator-runtime-semantics-evaluation
// UnaryExpression : `+` UnaryExpression
function* Evaluate_UnaryExpression_Plus(UnaryExpression) {
  const expr = yield* Evaluate(UnaryExpression);
  return Q(ToNumber(Q(GetValue(expr))));
}

// 12.5.7.1 #sec-unary-minus-operator-runtime-semantics-evaluation
// UnaryExpression : `-` UnaryExpression
function* Evaluate_UnaryExpression_Minus(UnaryExpression) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
  const oldValue = Q(ToNumeric(Q(GetValue(expr))));
  // 3. Let T be Type(oldValue).
  const T = TypeNumeric(oldValue);
  // 4. Return ! T::unaryMinus(oldValue).
  return X(T.unaryMinus(oldValue));
}

// 12.5.8.1 #sec-bitwise-not-operator-runtime-semantics-evaluation
// UnaryExpression : `~` UnaryExpression
function* Evaluate_UnaryExpression_Tilde(UnaryExpression) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
  const oldValue = Q(ToNumeric(Q(GetValue(expr))));
  // 3. Let T be Type(oldValue).
  const T = TypeNumeric(oldValue);
  // 4. Return ! T::bitwiseNOT(oldValue).
  return X(T.bitwiseNOT(oldValue));
}

// 12.5.9.1 #sec-logical-not-operator-runtime-semantics-evaluation
// UnaryExpression : `!` UnaryExpression
function* Evaluate_UnaryExpression_Bang(UnaryExpression) {
  const expr = yield* Evaluate(UnaryExpression);
  const oldValue = ToBoolean(Q(GetValue(expr)));
  if (oldValue === Value.true) {
    return Value.false;
  }
  return Value.true;
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
      throw new OutOfRange('Evaluate_UnaryExpression', UnaryExpression);
  }
}
