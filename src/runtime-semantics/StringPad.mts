// @ts-nocheck
import { Value } from '../value.mts';
import {
  Assert, ToString, ToLength, R,
} from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-stringpad */
export function StringPad(O, maxLength, fillString, placement: 'start' | 'end') {
  Assert(placement === 'start' || placement === 'end');
  const S = Q(ToString(O));
  const intMaxLength = R(Q(ToLength(maxLength)));
  const stringLength = S.stringValue().length;
  if (intMaxLength <= stringLength) {
    return S;
  }
  let filler;
  if (fillString === Value.undefined) {
    filler = ' ';
  } else {
    filler = Q(ToString(fillString)).stringValue();
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
