import {
  CreateBuiltinFunction as makeBuiltin,
  CreateIteratorFromClosure,
  Invoke,
  captureEvaluatorFrame,
  ObjectValue,
  Value,
  type Evaluator,
  type Arguments,
  type FunctionCallContext,
  Job,
  type NativeSteps,
  type ValueEvaluator,
  type YieldEvaluator,
} from '#self';

export function missingCapture(value: Value) {
  return makeBuiltin(
    () => value,
    0,
    'missingCapture',
    [],
    { captures: null },
  );
}

export function missingShorthandCapture(value: Value) {
  const behaviour: NativeSteps = () => value;
  return makeBuiltin(
    behaviour,
    0,
    'missingShorthandCapture',
    [],
    { captures: null },
  );
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
    captures: null,
  });
}

export function directEvaluatorStep(evaluator: Evaluator<Value>) {
  return evaluator.next({ resume: 'debugger', value: undefined });
}

export function missingIteratorCaptures(
  closure: () => YieldEvaluator,
  generatorPrototype: ObjectValue,
) {
  // @ts-expect-error This fixture intentionally omits the required captures option.
  return CreateIteratorFromClosure(closure, undefined, generatorPrototype, {});
}

export function* missingEvaluatorFrame(value: Value): Evaluator<Value> {
  yield { suspend: 'await' };
  return value;
}

export function* missingLocalEvaluatorFrame(): Evaluator<Value> {
  const value: Value = Value.undefined;
  yield { suspend: 'await' };
  return value;
}

export function* missingNestedUseFrame(value: Value): Evaluator<Value> {
  const nested = () => value;
  yield { suspend: 'await' };
  return nested();
}

/** https://tc39.es/ecma262/#sec-compact-missing-evaluator-frames */
export function* PromiseProto_catch(
  [onRejected = Value.undefined]: Arguments,
  { thisValue }: FunctionCallContext,
): ValueEvaluator {
  const promise = thisValue;
  yield* Invoke(promise, Value('then'), [Value.undefined, onRejected]);
  return promise;
}

/** https://tc39.es/ecma262/#sec-merge-evaluator-frames */
export function* mergeEvaluatorFrames(parameter: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(() => ({ parameter }), 'mergeEvaluatorFrames');
  const alias = parameter;
  using _2 = captureEvaluatorFrame(() => ({ alias }), 'mergeEvaluatorFrames');
  yield { suspend: 'await' };
  return alias === parameter ? alias : parameter;
}

export const redundantObjectMethodFrameName = {
  /** https://tc39.es/ecma262/#sec-redundant-object-method-frame-name */
  * Get(value: Value): Evaluator<Value> {
    using _ = captureEvaluatorFrame(() => ({ value }), 'Get');
    yield { suspend: 'await' };
    return value;
  },
};

/** https://tc39.es/ecma262/#sec-redundant-overload-frame-name */
export function redundantOverloadFrameName(value: Value): Evaluator<Value>
export function* redundantOverloadFrameName(value: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(() => ({ value }), 'redundantOverloadFrameName');
  yield { suspend: 'await' };
  return value;
}

/** https://tc39.es/ecma262/#typedarray-species-create */
export function* redundantNonSectionFrameName(value: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(() => ({ value }), 'TypedArraySpeciesCreate');
  yield { suspend: 'await' };
  return value;
}

export function* captureBeforeInitialization(value: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(
    () => ({
      later,
    }),
    'captureBeforeInitialization',
  );
  const later = value;
  yield { suspend: 'await' };
  return later;
}

/** https://tc39.es/ecma262/#sec-unnecessary-capture */
export function* unnecessaryCapture(value: Value, extra: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(() => ({ value, extra }), 'unnecessaryCapture');
  yield { suspend: 'await' };
  return value;
}

export const unannotatedEvaluator = {
  * evalScript(sourceText: Value) {
    const parsed = sourceText;
    using _ = captureEvaluatorFrame(() => ({ parsed, sourceText }), 'evalScript');
    yield { suspend: 'await' };
    return parsed;
  },
};
