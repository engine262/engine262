import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import { Value, wellKnownSymbols } from '../value.mjs';
import { AbruptCompletion, Q } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

// #sec-set-iterable
function SetConstructor([iterable = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let set be ? OrdinaryCreateFromConstructor(NewTarget, "%Set.prototype%", « [[SetData]] »).
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%Set.prototype%', ['SetData']));
  // 3. Set set.[[SetData]] to a new empty List.
  set.SetData = [];
  // 4. If iterable is either undefined or null, return set.
  if (iterable === Value.undefined || iterable === Value.null) {
    return set;
  }
  // 5. Let adder be ? Get(set, "add").
  const adder = Q(Get(set, new Value('add')));
  // 6. If IsCallable(adder) is false, throw a TypeError exception.
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
  }
  // 7. Let iteratorRecord be ? GetIterator(iterable).
  const iteratorRecord = Q(GetIterator(iterable));
  // 8. Repeat,
  while (true) {
    // a. Let next be ? IteratorStep(iteratorRecord).
    const next = Q(IteratorStep(iteratorRecord));
    // b. If next is false, return set.
    if (next === Value.false) {
      return set;
    }
    // c. Let nextValue be ? IteratorValue(next).
    const nextValue = Q(IteratorValue(next));
    // d. Let status be Call(adder, set, « nextValue »).
    const status = Call(adder, set, [nextValue]);
    // e. If status is an abrupt completion, return ? IteratorClose(iteratorRecord, status).
    if (status instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, status));
    }
  }
}

// #sec-get-set-@@species
function Set_speciesGetter(args, { thisValue }) {
  // Return the this value.
  return thisValue;
}

export function bootstrapSet(realmRec) {
  const setConstructor = bootstrapConstructor(realmRec, SetConstructor, 'Set', 0, realmRec.Intrinsics['%Set.prototype%'], [
    [wellKnownSymbols.species, [Set_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Set%'] = setConstructor;
}
