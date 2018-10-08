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
import { Value, Type } from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-delete-operator-runtime-semantics-evaluation
// UnaryExpression : `delete` UnaryExpression
function* Evaluate_UnaryExpression_Delete(UnaryExpression) {
  const ref = yield* Evaluate_Expression(UnaryExpression);
  ReturnIfAbrupt(ref);
  if (Type(ref) !== 'Reference') {
    return Value.true;
  }
  if (IsUnresolvableReference(ref) === Value.true) {
    Assert(IsStrictReference(ref) === Value.false);
    return Value.false;
  }
  if (IsPropertyReference(ref) === Value.true) {
    if (IsSuperReference(ref) === Value.true) {
      return surroundingAgent.Throw('ReferenceError');
    }
    const baseObj = X(ToObject(GetBase(ref)));
    const deleteStatus = Q(baseObj.Delete(GetReferencedName(ref)));
    if (deleteStatus === Value.false && IsStrictReference(ref) === Value.true) {
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
  return Value.undefined;
}

// #sec-typeof-operator-runtime-semantics-evaluation
// UnaryExpression : `typeof` UnaryExpression
function* Evaluate_UnaryExpression_Typeof(UnaryExpression) {
  let val = yield* Evaluate_Expression(UnaryExpression);
  if (Type(val) === 'Reference') {
    if (IsUnresolvableReference(val) === Value.true) {
      return new Value('undefined');
    }
  }
  val = Q(GetValue(val));

  // Return a String according to Table 35.

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
    case 'Symbol':
      return new Value('symbol');
    case 'Object':
      if (IsCallable(val) === Value.true) {
        return new Value('function');
      }
      return new Value('object');

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
    return new Value(NaN);
  }
  return new Value(-oldValue.numberValue());
}

// #sec-bitwise-not-operator-runtime-semantics-evaluation
// UnaryExpression : `~` UnaryExpression
function* Evaluate_UnaryExpression_Tilde(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
  const exprVal = Q(GetValue(expr));
  const oldValue = Q(ToInt32(exprVal));
  return new Value(~oldValue.numberValue()); // eslint-disable-line no-bitwise
}

// #sec-logical-not-operator-runtime-semantics-evaluation
// UnaryExpression : `!` UnaryExpression
function* Evaluate_UnaryExpression_Bang(UnaryExpression) {
  const expr = yield* Evaluate_Expression(UnaryExpression);
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
      throw outOfRange('Evaluate_UnaryExpression', UnaryExpression);
  }
}
