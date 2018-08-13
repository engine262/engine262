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
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Completion,
  Q,
} from '../completion.mjs';


// #sec-getiterator
export function GetIterator(
  obj,
  hint,
  method,
) {
  if (!hint) {
    hint = 'sync';
  }
  if (!method) {
    if (hint === 'async') {
      method = Q(GetMethod(obj, wellKnownSymbols.asyncIterator));
      if (Type(method) === 'Undefined') {
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
export function IteratorNext(iteratorRecord, value) {
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
export function IteratorComplete(iterResult) {
  Assert(Type(iterResult) === 'Object');
  return ToBoolean(Q(Get(iterResult, NewValue('done'))));
}

// #sec-iteratorvalue
export function IteratorValue(iterResult) {
  Assert(Type(iterResult) === 'Object');
  return Q(Get(iterResult, NewValue('value')));
}

// #sec-iteratorstep
export function IteratorStep(iteratorRecord) {
  const result = Q(IteratorNext(iteratorRecord));
  const done = Q(IteratorComplete(result));
  if (done.isTrue()) {
    return NewValue(false);
  }
  return result;
}

// #sec-iteratorclose
export function IteratorClose(
  iteratorRecord,
  completion,
) {
  Assert(Type(iteratorRecord.Iterator) === 'Object');
  Assert(completion instanceof Completion);
  const iterator = iteratorRecord.Iterator;
  const ret = Q(GetMethod(iterator, NewValue('return')));
  if (Type(ret) === 'Undefined') {
    return completion;
  }
  const innerResult = Call(ret, iterator, []);
  if (completion.Type === 'throw') {
    return completion;
  }
  if (innerResult.Type === 'throw') {
    return innerResult;
  }
  if (Type(innerResult.Value) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return completion;
}
