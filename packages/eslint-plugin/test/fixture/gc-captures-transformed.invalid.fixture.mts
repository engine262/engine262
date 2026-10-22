import { Value, type ValueEvaluator } from '#self';

export function* untransformable(): ValueEvaluator {
  for (let value: Value = Value.undefined; true;) {
    yield { suspend: 'await' };
    void value;
  }
}
