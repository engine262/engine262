import { Value, Type } from '../value.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  SameValue,
  OrdinaryObjectCreate,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-createforiniterator
export function CreateForInIterator(object) {
  // 1. Assert: Type(object) is Object.
  Assert(Type(object) === 'Object');
  // 2. Let iterator be ObjectCreate(%ForInIteratorPrototype%, « [[Object]], [[ObjectWasVisited]], [[VisitedKeys]], [[RemainingKeys]] »).
  const iterator = OrdinaryObjectCreate(surroundingAgent.intrinsic('%ForInIteratorPrototype%'), [
    'Object',
    'ObjectWasVisited',
    'VisitedKeys',
    'RemainingKeys',
  ]);
  // 3. Set iterator.[[Object]] to object.
  iterator.Object = object;
  // 4. Set iterator.[[ObjectWasVisited]] to false.
  iterator.ObjectWasVisited = Value.false;
  // 5. Set iterator.[[VisitedKeys]] to a new empty List.
  iterator.VisitedKeys = [];
  // 6. Set iterator.[[RemainingKeys]] to a new empty List.
  iterator.RemainingKeys = [];
  // 7. Return iterator.
  return iterator;
}

// #sec-%foriniteratorprototype%.next
function ForInIteratorPrototype_next(args, { thisValue }) {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. Assert: Type(O) is Object.
  Assert(Type(O) === 'Object');
  // 3. Assert: O has all the internal slot sof a For-In Iterator Instance.
  Assert('Object' in O && 'ObjectWasVisited' in O && 'VisitedKeys' in O && 'RemainingKeys in O');
  // 4. Let object be O.[[Object]].
  let object = O.Object;
  // 5. Let visited be O.[[VisitedKeys]].
  const visited = O.VisitedKeys;
  // 6. Let remaining be O.[[RemainingKeys]].
  const remaining = O.RemainingKeys;
  // 7. Repeat,
  while (true) {
    // a. If O.[[ObjectWasVisited]] is false, then
    if (O.ObjectWasVisited === Value.false) {
      // i. Let keys be ? object.[[OwnPropertyKeys]]().
      const keys = Q(object.OwnPropertyKeys());
      // ii. for each key of keys in List order, do
      for (const key of keys) {
        // 1. If Type(key) is String, then
        if (Type(key) === 'String') {
          // a. Append key to remaining.
          remaining.push(key);
        }
      }
      // iii. Set O.ObjectWasVisited to true.
      O.ObjectWasVisited = Value.true;
    }
    // b. Repeat, while remaining is not empty,
    while (remaining.length > 0) {
      // i. Remove the first element from remaining and let r be the value of the element.
      const r = remaining.shift();
      // ii. If there does not exist an element v of visisted such that SameValue(r, v) is true, then
      if (!visited.find((v) => SameValue(r, v) === Value.true)) {
        // 1. Let desc be ? object.[[GetOwnProperty]](r).
        const desc = Q(object.GetOwnProperty(r));
        // 2. If desc is not undefined, then,
        if (desc !== Value.undefined) {
          // a. Append r to visited.
          visited.push(r);
          // b. If desc.[[Enumerable]] is true, return CreateIterResultObject(r, false).
          if (desc.Enumerable === Value.true) {
            return CreateIterResultObject(r, Value.false);
          }
        }
      }
    }
    // c. Set object to ? object.[[GetPrototypeOf]]().
    object = Q(object.GetPrototypeOf());
    // d. Set O.Object to object.
    O.Object = object;
    // e. Set O.ObjectWasVisited to false.
    O.ObjectWasVisited = Value.false;
    // f. If object is null, return CreateIterResultObject(undefined, true).
    if (object === Value.null) {
      return CreateIterResultObject(Value.undefined, Value.true);
    }
  }
}

export function BootstrapForInIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', ForInIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%']);

  realmRec.Intrinsics['%ForInIteratorPrototype%'] = proto;
}
