import {
  CreateBuiltinFunction,
  CreateIteratorFromClosure,
  Value,
  type CanBeNativeSteps,
  type NativeSteps,
  type ObjectValue,
  type YieldEvaluator,
} from '#self';

export function missingBuiltinOptions(value: Value) {
  function behaviour() {
    return value;
  }
  // @ts-expect-error This fixture intentionally omits the captures options.
  return CreateBuiltinFunction(behaviour, 0, 'missingBuiltinOptions', []);
}

export function missingBuiltinField(value: Value) {
  const behaviour: NativeSteps = () => value;
  // @ts-expect-error This fixture intentionally omits captures.
  return CreateBuiltinFunction(behaviour, 0, 'missingBuiltinField', [], { async: false });
}

export function missingMemberCapture(value: ObjectValue) {
  const holder: { Value: ObjectValue | undefined } = { Value: value };
  const behaviour: NativeSteps = () => holder.Value ?? Value.undefined;
  // @ts-expect-error This fixture intentionally omits captures.
  return CreateBuiltinFunction(behaviour, 0, 'missingMemberCapture', [], { async: false });
}

export function missingEmptyBuiltinCapture() {
  const behaviour: NativeSteps = () => Value.undefined;
  // @ts-expect-error This fixture intentionally omits the captures options.
  return CreateBuiltinFunction(behaviour, 0, 'missingEmptyBuiltinCapture', []);
}

export function missingFromCapture(value: Value) {
  const steps: CanBeNativeSteps = () => value;
  // @ts-expect-error This fixture intentionally omits captures.
  return CreateBuiltinFunction.from({
    steps,
    name: 'missingFromCapture',
  });
}

export function missingIteratorCapture(value: Value, prototype: ObjectValue) {
  const closure = function* closure(): YieldEvaluator {
    return value;
  };
  // @ts-expect-error This fixture intentionally omits captures.
  return CreateIteratorFromClosure(closure, undefined, prototype, {});
}

export function unresolvedBehaviour(behaviour: NativeSteps) {
  // @ts-expect-error This fixture intentionally omits the captures options.
  return CreateBuiltinFunction(behaviour, 0, 'unresolvedBehaviour', []);
}

export function missingNestedBuiltinCapture(value: Value) {
  const behaviour: NativeSteps = () => {
    const nested = () => value;
    return nested();
  };
  // @ts-expect-error This fixture intentionally omits captures.
  return CreateBuiltinFunction(behaviour, 0, 'missingNestedBuiltinCapture', [], { async: false });
}
