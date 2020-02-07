import { Type, Value } from '../value.mjs';
import {
  Assert,
  CodePointAt,
  CreateIterResultObject,
  ObjectCreate,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';


// 21.1.5.1 #sec-createstringiterator
export function CreateStringIterator(string) {
  Assert(Type(string) === 'String');
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%StringIteratorPrototype%'), [
    'IteratedString',
    'StringNextIndex',
  ]);
  iterator.IteratedString = string;
  iterator.StringNextIndex = 0;
  return iterator;
}

function StringIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'String Iterator', O);
  }
  if (!('IteratedString' in O && 'StringNextIndex' in O)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'String Iterator', O);
  }
  const s = O.IteratedString;
  if (s === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const position = O.StringNextIndex;
  const len = s.stringValue().length;
  if (position >= len) {
    O.IteratedString = Value.undefined;
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const cp = X(CodePointAt(s, position));
  const resultString = new Value(s.stringValue().substr(position, cp.CodeUnitCount.numberValue()));
  O.StringNextIndex = position + cp.CodeUnitCount.numberValue();
  return CreateIterResultObject(resultString, Value.false);
}

export function BootstrapStringIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
