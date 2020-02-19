import { Value } from '../value.mjs';
import { Assert, ToString, ToLength } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-stringpad
export function StringPad(O, maxLength, fillString, placement) {
  Assert(placement === 'start' || placement === 'end');
  const S = Q(ToString(O));
  const intMaxLength = Q(ToLength(maxLength)).numberValue();
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
    return new Value(truncatedStringFiller + S.stringValue());
  } else {
    return new Value(S.stringValue() + truncatedStringFiller);
  }
}
