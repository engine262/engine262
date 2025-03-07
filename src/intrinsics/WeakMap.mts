// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
import {
  Get,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mts';
import {
  Value,
} from '../value.mts';
import {
  Q,
} from '../completion.mts';
import { AddEntriesFromIterable } from './Map.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-weakmap-constructor */
function WeakMapConstructor([iterable = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakMap.prototype%", « [[WeakMapData]] »).
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%WeakMap.prototype%', ['WeakMapData']));
  // 3. Set map.[[WeakMapData]] to a new empty List.
  map.WeakMapData = [];
  // 4. If iterable is either undefined or null, return map.
  if (iterable === Value.undefined || iterable === Value.null) {
    return map;
  }
  // 5. Let adder be ? Get(map, "set").
  const adder = Q(Get(map, Value('set')));
  // 6. Return ? AddEntriesFromIterable(map, iterable, adder).
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

export function bootstrapWeakMap(realmRec) {
  const c = bootstrapConstructor(realmRec, WeakMapConstructor, 'WeakMap', 0, realmRec.Intrinsics['%WeakMap.prototype%'], []);

  realmRec.Intrinsics['%WeakMap%'] = c;
}
