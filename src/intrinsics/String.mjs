import {
  Get,
  GetPrototypeFromConstructor,
  StringCreate,
  SymbolDescriptiveString,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function StringConstructor(args, { callLength, NewTarget }) {
  let s;
  if (callLength === 0) {
    // String ( )
    s = new Value('');
  } else {
    // String ( value )
    const [value] = args;
    if (NewTarget === Value.undefined && Type(value) === 'Symbol') {
      return X(SymbolDescriptiveString(value));
    }
    s = Q(ToString(value));
  }
  if (NewTarget === Value.undefined) {
    return s;
  }
  return X(StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%StringPrototype%'))));
}

function String_raw([template, ...substitutions]) {
  const numberOfSubstitutions = substitutions.length;
  const cooked = Q(ToObject(template));
  const raw = Q(ToObject(Q(Get(cooked, new Value('raw')))));
  const literalSegments = Q(ToLength(Q(Get(raw, new Value('length'))))).numberValue();
  if (literalSegments <= 0) {
    return new Value('');
  }
  const stringElements = [];
  let nextIndex = 0;
  while (true) {
    const nextKey = X(ToString(new Value(nextIndex)));
    const nextSeg = Q(ToString(Q(Get(raw, nextKey))));
    stringElements.push(nextSeg.stringValue());
    if (nextIndex + 1 === literalSegments) {
      return new Value(stringElements.join(''));
    }
    let next;
    if (nextIndex < numberOfSubstitutions) {
      next = substitutions[nextIndex];
    } else {
      next = new Value('');
    }
    const nextSub = Q(ToString(next));
    stringElements.push(nextSub.stringValue());
    nextIndex += 1;
  }
}

export function CreateString(realmRec) {
  const stringConstructor = BootstrapConstructor(realmRec, StringConstructor, 'String', 1, realmRec.Intrinsics['%StringPrototype%'], [
    ['raw', String_raw, 1],
  ]);

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
