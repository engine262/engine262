import { Type, Value } from '../value.mjs';
import { Assert, CreateIterResultObject, ObjectCreate } from '../abstract-ops/all.mjs';
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
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'String Iterator.prototype.next'));
  }
  if (!('IteratedString' in O && 'StringIteratorNextIndex' in O)) {
    return surroundingAgent.Throw('TypeError', msg('IncompatibleReceiver', 'String Iterator.prototype.next'));
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
  const first = s.stringValue().charCodeAt(position);
  let resultString;
  if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
    resultString = new Value(String.fromCharCode(first));
  } else {
    const second = s.stringValue().charCodeAt(position + 1);
    if (second < 0xDC00 || second > 0xDFFF) {
      resultString = new Value(String.fromCharCode(first));
    } else {
      resultString = new Value(`${String.fromCharCode(first)}${String.fromCharCode(second)}`);
    }
  }
  const resultSize = resultString.stringValue().length;
  O.StringIteratorNextIndex = position + resultSize;
  return CreateIterResultObject(resultString, Value.false);
}

export function CreateStringIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
