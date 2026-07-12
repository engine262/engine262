import {
  CreateBuiltinFunction,
  captureEvaluatorFrame,
  Value,
  type Evaluator,
  type NativeSteps,
  type ObjectValue,
} from '#self';

export function validCapture(value: Value) {
  const behaviour: NativeSteps = () => value;
  return CreateBuiltinFunction(
    behaviour,
    0,
    'validCapture',
    [],
    {
      captures: () => ({ value }),
    },
  );
}

export function validMemberCapture(value: ObjectValue) {
  const holder: { Value: ObjectValue | undefined } = { Value: value };
  const behaviour: NativeSteps = () => holder.Value ?? Value.undefined;
  return CreateBuiltinFunction(behaviour, 0, 'validMemberCapture', [], {
    captures: () => ({ current: holder.Value }),
  });
}

/** https://tc39.es/ecma262/#sec-valid-capture */
export function* validSpecCapture(value: Value): Evaluator<Value> {
  using _ = captureEvaluatorFrame(() => ({ value }), 'validSpecCapture');
  yield { suspend: 'await' };
  return value;
}

/** https://tc39.es/ecma262/#sec-valid-callable-capture */
export function* validCallableCapture(value: Value): Evaluator<Value> {
  const callable = () => value;
  using _ = captureEvaluatorFrame(() => ({ callable }), 'validCallableCapture');
  yield { suspend: 'await' };
  return callable();
}
