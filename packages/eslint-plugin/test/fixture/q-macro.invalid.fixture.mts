import {
  namedCompletion,
  type NamedResult,
  stringCompletion,
  stringEvaluator,
  unavailableCompletion,
  unavailableEvaluator,
  valueCompletion,
  valueEvaluator,
} from './q-macro-types.fixture.mjs';
import {
  type EvaluatorNextType,
  type EvaluatorYieldType,
  Q,
  type Value,
} from '#self';

export function inferredValue(value: Value) {
  return Q(valueCompletion(value));
}

export const inferredArrow = (value: Value) => Q(valueCompletion(value));

export function* inferredValueEvaluator() {
  return Q(yield* valueEvaluator());
}

export function inferredString() {
  return Q(stringCompletion());
}

export function* inferredStringEvaluator() {
  return Q(yield* stringEvaluator());
}

export function inferredNamed() {
  return Q(namedCompletion());
}

export function inferredUnavailable() {
  return Q(unavailableCompletion());
}

export function* inferredUnavailableEvaluator() {
  return Q(yield* unavailableEvaluator());
}

export function annotatedValue(value: Value): Value {
  return Q(valueCompletion(value));
}

export function* annotatedValueEvaluator(): Generator<EvaluatorYieldType, Value, EvaluatorNextType> {
  return Q(yield* valueEvaluator());
}

export function annotatedNamed(): NamedResult {
  return Q(namedCompletion());
}
