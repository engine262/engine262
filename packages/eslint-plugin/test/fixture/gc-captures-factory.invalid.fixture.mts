import {
  CreateBuiltinFunction,
  CreateIteratorFromClosure,
  Job,
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
  // The compiler inserts the captures option in auto mode.
  return CreateBuiltinFunction(behaviour, 0, 'missingBuiltinOptions', []);
}

export function missingBuiltinField(value: Value) {
  const behaviour: NativeSteps = () => value;
  // The compiler inserts captures in auto mode.
  return CreateBuiltinFunction(behaviour, 0, 'missingBuiltinField', [], { async: false });
}

export function missingMemberCapture(value: ObjectValue) {
  const holder: { Value: ObjectValue | undefined } = { Value: value };
  const behaviour: NativeSteps = () => holder.Value ?? Value.undefined;
  // The compiler inserts captures in auto mode.
  return CreateBuiltinFunction(behaviour, 0, 'missingMemberCapture', [], { async: false });
}

export function missingEmptyBuiltinCapture() {
  const behaviour: NativeSteps = () => Value.undefined;
  // The compiler inserts the captures option in auto mode.
  return CreateBuiltinFunction(behaviour, 0, 'missingEmptyBuiltinCapture', []);
}

export function missingFromCapture(value: Value) {
  const steps: CanBeNativeSteps = () => value;
  // The compiler inserts captures in auto mode.
  return CreateBuiltinFunction.from(steps, {
    name: 'missingFromCapture',
  });
}

export function missingIteratorCapture(value: Value, prototype: ObjectValue) {
  const closure = function* closure(): YieldEvaluator {
    return value;
  };
  // The compiler inserts captures in auto mode.
  return CreateIteratorFromClosure(closure, undefined, prototype, {});
}

export function generatedIteratorCapture(value: Value, prototype: ObjectValue) {
  const closure = function* generatedIteratorClosure(): YieldEvaluator {
    return value;
  };
  return CreateIteratorFromClosure(closure, undefined, prototype, { captures: () => ({ value }) });
}

export function unresolvedBehaviour(behaviour: NativeSteps) {
  // This unresolved closure must be diagnosed by the linter.
  return CreateBuiltinFunction(behaviour, 0, 'unresolvedBehaviour', []);
}

export function missingNestedBuiltinCapture(value: Value) {
  const behaviour: NativeSteps = () => {
    const nested = () => value;
    return nested();
  };
  // The compiler inserts captures in auto mode.
  return CreateBuiltinFunction(behaviour, 0, 'missingNestedBuiltinCapture', [], { async: false });
}

export function missingJobCapture(value: Value) {
  return new Job({
    name: 'missingJobCapture',
    queueName: 'test',
    evaluate: function* missingJobCaptureEvaluate() {
      return value;
    },
    callerRealm: undefined,
    callerScriptOrModule: Value.null,
  });
}

export function generatedJobCapture(value: Value) {
  return new Job({
    name: 'generatedJobCapture',
    queueName: 'test',
    evaluate: function* generatedJobCaptureEvaluate() {
      return value;
    },
    callerRealm: undefined,
    callerScriptOrModule: Value.null,
    captures: () => ({ value }),
  });
}
