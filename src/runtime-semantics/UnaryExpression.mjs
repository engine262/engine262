import { surroundingAgent } from '../engine.mjs';
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

// #sec-delete-operator-runtime-semantics-evaluation
//   UnaryExpression : `delete` UnaryExpression
function* Evaluate_UnaryExpression_Delete({ UnaryExpression }) {
  // 1. Let ref be the result of evaluating UnaryExpression.
  const ref = yield* Evaluate(UnaryExpression);
  // 2. ReturnIfAbrupt(ref).
  ReturnIfAbrupt(ref);
  // 3. If Type(ref) is not Reference, return true.
  if (Type(ref) !== 'Reference') {
    return Value.true;
  }
  // 4. If IsUnresolvableReference(ref) is true, then
  if (IsUnresolvableReference(ref) === Value.true) {
    // a. Assert: IsStrictReference(ref) is false.
    Assert(IsStrictReference(ref) === Value.false);
    // b. Return true.
    return Value.true;
  }
  // 5. If IsPropertyReference(ref) is true, then
  if (IsPropertyReference(ref) === Value.true) {
    // a. If IsSuperReference(ref) is true, throw a ReferenceError exception.
    if (IsSuperReference(ref) === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'CannotDeleteSuper');
    }
    // b. Let baseObj be ! ToObject(GetBase(ref)).
    const baseObj = X(ToObject(GetBase(ref)));
    // c. Let deleteStatus be ? baseObj.[[Delete]](GetReferencedName(ref)).
    const deleteStatus = Q(baseObj.Delete(GetReferencedName(ref)));
    // d. If deleteStatus is false and IsStrictReference(ref) is true, throw a TypeError exception.
    if (deleteStatus === Value.false && IsStrictReference(ref) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'StrictModeDelete', GetReferencedName(ref));
    }
    // e. Return deleteStatus.
    return deleteStatus;
  } else { // 6. Else,
    // a. Assert: ref is a Reference to an Environment Record binding.
    // b. Let bindings be GetBase(ref).
    const bindings = GetBase(ref);
    // c. Return ? bindings.DeleteBinding(GetReferencedName(ref)).
    return Q(bindings.DeleteBinding(GetReferencedName(ref)));
  }
}

// #sec-void-operator-runtime-semantics-evaluation
//   UnaryExpression : `void` UnaryExpression
function* Evaluate_UnaryExpression_Void({ UnaryExpression }) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Perform ? GetValue(expr).
  Q(GetValue(expr));
  // 3. Return undefined.
  return Value.undefined;
}

// 12.5.5.1 #sec-typeof-operator-runtime-semantics-evaluation
// UnaryExpression : `typeof` UnaryExpression
function* Evaluate_UnaryExpression_Typeof({ UnaryExpression }) {
  // 1. Let val be the result of evaluating UnaryExpression.
  let val = yield* Evaluate(UnaryExpression);
  // 2. If Type(val) is Reference, then
  if (Type(val) === 'Reference') {
    // a. If IsUnresolvableReference(val) is true, return "undefined".
    if (IsUnresolvableReference(val) === Value.true) {
      return new Value('undefined');
    }
  }
  // 3. Set val to ? GetValue(val).
  val = Q(GetValue(val));
  // 4. Return a String according to Table 37.
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

// #sec-unary-plus-operator-runtime-semantics-evaluation
//   UnaryExpression : `+` UnaryExpression
function* Evaluate_UnaryExpression_Plus({ UnaryExpression }) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Return ? ToNumber(? GetValue(expr)).
  return Q(ToNumber(Q(GetValue(expr))));
}

// #sec-unary-minus-operator-runtime-semantics-evaluation
//   UnaryExpression : `-` UnaryExpression
function* Evaluate_UnaryExpression_Minus({ UnaryExpression }) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
  const oldValue = Q(ToNumeric(Q(GetValue(expr))));
  // 3. Let T be Type(oldValue).
  const T = TypeNumeric(oldValue);
  // 4. Return ! T::unaryMinus(oldValue).
  return X(T.unaryMinus(oldValue));
}

// #sec-bitwise-not-operator-runtime-semantics-evaluation
//   UnaryExpression : `~` UnaryExpression
function* Evaluate_UnaryExpression_Tilde({ UnaryExpression }) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
  const oldValue = Q(ToNumeric(Q(GetValue(expr))));
  // 3. Let T be Type(oldValue).
  const T = TypeNumeric(oldValue);
  // 4. Return ! T::bitwiseNOT(oldValue).
  return X(T.bitwiseNOT(oldValue));
}

// #sec-logical-not-operator-runtime-semantics-evaluation
//   UnaryExpression : `!` UnaryExpression
function* Evaluate_UnaryExpression_Bang({ UnaryExpression }) {
  // 1. Let expr be the result of evaluating UnaryExpression.
  const expr = yield* Evaluate(UnaryExpression);
  // 2. Let oldValue be ! ToBoolean(? GetValue(expr)).
  const oldValue = ToBoolean(Q(GetValue(expr)));
  // 3. If oldValue is true, return false.
  if (oldValue === Value.true) {
    return Value.false;
  }
  // 4. Return true.
  return Value.true;
}

// UnaryExpression :
//  `delete` UnaryExpression
//  `void` UnaryExpression
//  `typeof` UnaryExpression
//  `+` UnaryExpression
//  `-` UnaryExpression
//  `~` UnaryExpression
//  `!` UnaryExpression
export function* Evaluate_UnaryExpression(UnaryExpression) {
  switch (UnaryExpression.operator) {
    case 'delete':
      return yield* Evaluate_UnaryExpression_Delete(UnaryExpression);
    case 'void':
      return yield* Evaluate_UnaryExpression_Void(UnaryExpression);
    case 'typeof':
      return yield* Evaluate_UnaryExpression_Typeof(UnaryExpression);
    case '+':
      return yield* Evaluate_UnaryExpression_Plus(UnaryExpression);
    case '-':
      return yield* Evaluate_UnaryExpression_Minus(UnaryExpression);
    case '~':
      return yield* Evaluate_UnaryExpression_Tilde(UnaryExpression);
    case '!':
      return yield* Evaluate_UnaryExpression_Bang(UnaryExpression);

    default:
      throw new OutOfRange('Evaluate_UnaryExpression', UnaryExpression);
  }
}
