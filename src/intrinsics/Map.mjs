import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  IfAbruptCloseIterator,
  Q,
} from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

export function AddEntriesFromIterable(target, iterable, adder) {
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
  }
  Assert(iterable !== undefined && iterable !== Value.undefined && iterable !== Value.null);
  const iteratorRecord = Q(GetIterator(iterable));
  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (next === Value.false) {
      return target;
    }
    const nextItem = Q(IteratorValue(next));
    if (Type(nextItem) !== 'Object') {
      const error = surroundingAgent.Throw('TypeError', 'NotAnObject', nextItem);
      return Q(IteratorClose(iteratorRecord, error));
    }
    // e. Let k be Get(nextItem, "0").
    const k = Get(nextItem, new Value('0'));
    // f. IfAbruptCloseIterator(k, iteratorRecord).
    IfAbruptCloseIterator(k, iteratorRecord);
    // g. Let v be Get(nextItem, "1").
    const v = Get(nextItem, new Value('1'));
    // h. IfAbruptCloseIterator(v, iteratorRecord).
    IfAbruptCloseIterator(v, iteratorRecord);
    // i. Let status be Call(adder, target, « k, v »).
    const status = Call(adder, target, [k, v]);
    // j. IfAbruptCloseIterator(status, iteratorRecord).
    IfAbruptCloseIterator(status, iteratorRecord);
  }
}

// #sec-map-iterable
function MapConstructor([iterable = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%Map.prototype%", « [[MapData]] »).
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%Map.prototype%', ['MapData']));
  // 3. Set map.[[MapData]] to a new empty List.
  map.MapData = [];
  // 4. If iterable is either undefined or null, return map.
  if (iterable === Value.undefined || iterable === Value.null) {
    return map;
  }
  // 5. Let adder be ? Get(map, "set").
  const adder = Q(Get(map, new Value('set')));
  // 6. Return ? AddEntriesFromIterable(map, iterable, adder).
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

// #sec-get-map-@@species
function Map_speciesGetter(args, { thisValue }) {
  // 1. Return the this value.
  return thisValue;
}

export function bootstrapMap(realmRec) {
  const mapConstructor = bootstrapConstructor(realmRec, MapConstructor, 'Map', 0, realmRec.Intrinsics['%Map.prototype%'], [
    [wellKnownSymbols.species, [Map_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
