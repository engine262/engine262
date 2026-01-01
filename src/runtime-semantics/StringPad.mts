import { JSStringValue, Value } from '../value.mts';
import { Q } from '../completion.mts';
import type { ValueEvaluator } from '../evaluator.mts';
import {
  Assert, ToString, ToLength, R,
} from '#self';

/** https://tc39.es/ecma262/#sec-stringpad */
export function* StringPad(O: Value, maxLength: Value, fillString: Value, placement: 'start' | 'end'): ValueEvaluator<JSStringValue> {
  Assert(placement === 'start' || placement === 'end');
  const S = Q(yield* ToString(O));
  const intMaxLength = R(Q(yield* ToLength(maxLength)));
  const stringLength = S.stringValue().length;
  if (intMaxLength <= stringLength) {
    return S;
  }
  let filler;
  if (fillString === Value.undefined) {
    filler = ' ';
  } else {
    filler = Q(yield* ToString(fillString)).stringValue();
  }
  if (filler === '') {
    return S;
  }
  const fillLen = intMaxLength - stringLength;
  const stringFiller = filler.repeat(Math.ceil(fillLen / filler.length));
  const truncatedStringFiller = stringFiller.slice(0, fillLen);
  if (placement === 'start') {
    return Value(truncatedStringFiller + S.stringValue());
  } else {
    return Value(S.stringValue() + truncatedStringFiller);
  }
}
