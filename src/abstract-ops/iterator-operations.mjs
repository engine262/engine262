/* @flow */

import {
  Assert,
  GetMethod,
  Get,
  GetV,
  Call,
  ToBoolean,
} from './all.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  UndefinedValue,
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Completion,
  Q,
} from '../completion.mjs';

/* ::
import type {
  Value,
  ObjectValue,
  FunctionValue,
} from '../value.mjs';

declare type GetIteratorHint = 'sync' | 'async';
declare type IteratorRecord = {
  Iterator: ObjectValue,
  NextMethod: FunctionValue,
  Done: boolean,
};
*/

// #sec-getiterator
export function GetIterator(
  obj /* : ObjectValue */,
  hint /* : ?GetIteratorHint */,
  method /* : ?Value */,
) {
  if (!hint) {
    hint = 'sync';
  }
  if (!method) {
    if (hint === 'async') {
      method = Q(GetMethod(obj, wellKnownSymbols.asyncIterator));
      if (method instanceof UndefinedValue) {
        const syncMethod = Q(GetMethod(obj, wellKnownSymbols.iterator));
        const syncIteratorRecord = Q(GetIterator(obj, 'sync', syncMethod));
        return Q(CreateAsyncFromSyncIterator(syncIteratorRecord));
      }
    } else {
      method = Q(GetMethod(obj, wellKnownSymbols.iterator));
    }
  }
  const iterator = Q(Call(method, obj, []));
  if (Type(iterator) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const nextMethod = Q(GetV(iterator, NewValue('next')));
  const iteratorRecord = {
    Iterator: iterator,
    NextMethod: nextMethod,
    Done: false,
  };
  return iteratorRecord;
}

// #sec-iteratornext
export function IteratorNext(iteratorRecord /* : IteratorRecord */, value /* : ?Value */) {
  let result;
  if (!value) {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, []));
  } else {
    result = Q(Call(iteratorRecord.NextMethod, iteratorRecord.Iterator, [value]));
  }
  if (Type(result) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return result;
}

// #sec-iteratorcomplete
export function IteratorComplete(iterResult /* : ObjectValue */) {
  Assert(Type(iterResult) === 'Object');
  return ToBoolean(Q(Get(iterResult, NewValue('done'))));
}

// #sec-iteratorvalue
export function IteratorValue(iterResult /* : ObjectValue */) {
  Assert(Type(iterResult) === 'Object');
  return Q(Get(iterResult, NewValue('value')));
}

// #sec-iteratorstep
export function IteratorStep(iteratorRecord /* : IteratorRecord */) {
  const result = Q(IteratorNext(iteratorRecord));
  const done = Q(IteratorComplete(result));
  if (done.isTrue()) {
    return NewValue(false);
  }
  return result;
}

// #sec-iteratorclose
export function IteratorClose(
  iteratorRecord /* : IteratorRecord */,
  completion /* : Completion */,
) {
  Assert(Type(iteratorRecord.Iterator) === 'Object');
  Assert(completion instanceof Completion);
  const iterator = iteratorRecord.Iterator;
  const ret = Q(GetMethod(iterator, NewValue('return')));
  if (ret instanceof UndefinedValue) {
    return completion;
  }
  const innerResult = Call(ret, iterator, []);
  if (completion.Type === 'throw') {
    throw completion;
  }
  if (innerResult.Type === 'throw') {
    throw innerResult;
  }
  if (Type(innerResult.Value) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return completion;
}
