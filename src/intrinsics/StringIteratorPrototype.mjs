import { Type, Value } from '../value.mjs';
import {
  Assert,
  CreateIterResultObject,
  OrdinaryObjectCreate,
} from '../abstract-ops/all.mjs';
import { CodePointAt } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';


// #sec-createstringiterator
export function CreateStringIterator(string) {
  // 1. Assert: Type(string) is String.
  Assert(Type(string) === 'String');
  // 2. Let iterator be OrdinaryObjectCreate(%StringIteratorPrototype%, « [[IteratedString]], [[StringNextIndex]] »).
  const iterator = OrdinaryObjectCreate(surroundingAgent.intrinsic('%StringIteratorPrototype%'), [
    'IteratedString',
    'StringNextIndex',
  ]);
  // 3. Set iterator.[[IteratedString]] to string.
  iterator.IteratedString = string;
  // 4. Set iterator.[[StringNextIndex]] to 0.
  iterator.StringNextIndex = 0;
  // 5. Return iterator.
  return iterator;
}

// #sec-%stringiteratorprototype%.next
function StringIteratorPrototype_next(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'String Iterator', O);
  }
  // 3. If O does not have all of the internal slots of a String Iterator Instance (21.1.5.3), throw a TypeError exception.
  if (!('IteratedString' in O && 'StringNextIndex' in O)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'String Iterator', O);
  }
  // 4. Let s be O.[[IteratedString]].
  const s = O.IteratedString;
  // 5. Let s be O.[[IteratedString]].
  if (s === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 6. If s is undefined, return CreateIterResultObject(undefined, true).
  const position = O.StringNextIndex;
  // 7. Let len be the length of s.
  const len = s.stringValue().length;
  // 8. If position ≥ len, then
  if (position >= len) {
    // a. Set O.[[IteratedString]] to undefined.
    O.IteratedString = Value.undefined;
    // b. Return CreateIterResultObject(undefined, true).
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 9. Let cp be ! CodePointAt(s, position).
  const cp = X(CodePointAt(s.stringValue(), position));
  // 10. Let resultString be the String value containing cp.[[CodeUnitCount]] consecutive code units from s beginning with the code unit at index position.
  const resultString = new Value(s.stringValue().substr(position, cp.CodeUnitCount));
  // 11. Set O.[[StringNextIndex]] to position + cp.[[CodeUnitCount]].
  O.StringNextIndex = position + cp.CodeUnitCount;
  // 12. Return CreateIterResultObject(resultString, false).
  return CreateIterResultObject(resultString, Value.false);
}

export function bootstrapStringIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
