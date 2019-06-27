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
import { msg } from '../helpers.mjs';

// 21.1.5.1 #sec-createstringiterator
export function CreateStringIterator(string) {
  Assert(Type(string) === 'String');
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%StringIteratorPrototype%'), [
    'IteratedString',
    'StringIteratorNextIndex',
  ]);
  iterator.IteratedString = string;
  iterator.StringIteratorNextIndex = 0;
  return iterator;
}

function StringIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'String Iterator', O));
  }
  if (!('IteratedString' in O && 'StringIteratorNextIndex' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'String Iterator', O));
  }
  const s = O.IteratedString;
  if (s === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const position = O.StringIteratorNextIndex;
  const len = s.stringValue().length;
  if (position >= len) {
    O.IteratedString = Value.undefined;
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const cp = X(CodePointAt(s, position));
  const resultString = new Value(s.stringValue().substr(position, cp.CodeUnitCount.numberValue()));
  O.StringIteratorNextIndex = position + cp.CodeUnitCount.numberValue();
  return CreateIterResultObject(resultString, Value.false);
}

export function CreateStringIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
