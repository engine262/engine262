import { surroundingAgent } from '../engine.mts';
import {
  Get,
  OrdinaryCreateFromConstructor,
  Realm,
  type FunctionObject,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import {
  UndefinedValue,
  Value,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Q,
} from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { AddEntriesFromIterable } from './Map.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface WeakMapObject extends OrdinaryObject {
  readonly WeakMapData: { Key: Value | undefined; Value: Value | undefined; }[];
}
export function isWeakMapObject(object: object): object is WeakMapObject {
  return 'WeakMapData' in object;
}
/** https://tc39.es/ecma262/#sec-weakmap-constructor */
function WeakMapConstructor(this: FunctionObject, [iterable = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakMap.prototype%", « [[WeakMapData]] »).
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%WeakMap.prototype%', ['WeakMapData'])) as Mutable<WeakMapObject>;
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

export function bootstrapWeakMap(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, WeakMapConstructor, 'WeakMap', 0, realmRec.Intrinsics['%WeakMap.prototype%'], []);

  realmRec.Intrinsics['%WeakMap%'] = c;
}
