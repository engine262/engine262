import { Q, type Value, type ValueCompletion, type ValueEvaluator } from '@engine262/engine262';

function* Action(value: Value): ValueEvaluator {
  return value;
}

function MayFail(value: Value): ValueCompletion {
  return value;
}

/**
 * 1. Perform ? Action(value).
 * 1. Return value.
 */
export function* Evaluate(value: Value) {
  // Linter: if remove yield*, it will report @engine262/no-floating-evaluator
  yield* Action(value);
  return value;
}

/**
 * 1. Return ? MayFail(value).
 */
// Linter: if omit the return type, it will report "The function return type does not include ThrowCompletion"
export function Evaluate2(value: Value): ValueCompletion {
  return Q(MayFail(value));
}
