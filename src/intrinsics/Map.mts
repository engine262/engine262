import { surroundingAgent } from '../engine.mts';
import {
  Assert,
  Call,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStepValue,
  OrdinaryCreateFromConstructor,
  Realm,
  type FunctionObject,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import {
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  IfAbruptCloseIterator,
  Q,
  type ExpressionCompletion,
} from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export function AddEntriesFromIterable(target: ObjectValue, iterable: Value, adder: FunctionObject): ExpressionCompletion {
  Assert(iterable !== Value.undefined && iterable !== Value.null);
  const iteratorRecord = Q(GetIterator(iterable, 'sync'));
  while (true) {
    const next = Q(IteratorStepValue(iteratorRecord));
    if (next === 'done') {
      return target;
    }
    if (!(next instanceof ObjectValue)) {
      const error = surroundingAgent.Throw('TypeError', 'NotAnObject', next);
      return Q(IteratorClose(iteratorRecord, error));
    }
    // e. Let k be Get(nextItem, "0").
    const k = Get(next, Value('0'));
    // f. IfAbruptCloseIterator(k, iteratorRecord).
    IfAbruptCloseIterator(k, iteratorRecord);
    __ts_cast__<Value>(k);
    // g. Let v be Get(nextItem, "1").
    const v = Get(next, Value('1'));
    // h. IfAbruptCloseIterator(v, iteratorRecord).
    IfAbruptCloseIterator(v, iteratorRecord);
    __ts_cast__<Value>(v);
    // i. Let status be Call(adder, target, « k, v »).
    const status = Call(adder, target, [k, v]);
    // j. IfAbruptCloseIterator(status, iteratorRecord).
    IfAbruptCloseIterator(status, iteratorRecord);
  }
}

export interface MapObject extends OrdinaryObject {
  readonly MapData: { Key: Value | undefined, Value: Value | undefined }[];
}
/** https://tc39.es/ecma262/#sec-map-iterable */
function MapConstructor(this: FunctionObject, [iterable = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%Map.prototype%", « [[MapData]] »).
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%Map.prototype%', ['MapData'])) as Mutable<MapObject>;
  // 3. Set map.[[MapData]] to a new empty List.
  map.MapData = [];
  // 4. If iterable is either undefined or null, return map.
  if (iterable === Value.undefined || iterable === Value.null) {
    return map;
  }
  // 5. Let adder be ? Get(map, "set").
  const adder = Q(Get(map, Value('set')));
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
  }
  // 6. Return ? AddEntriesFromIterable(map, iterable, adder).
  return Q(AddEntriesFromIterable(map, iterable, adder as FunctionObject));
}

/** https://tc39.es/ecma262/#sec-get-map-@@species */
function Map_speciesGetter(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return the this value.
  return thisValue;
}

export function bootstrapMap(realmRec: Realm) {
  const mapConstructor = bootstrapConstructor(realmRec, MapConstructor, 'Map', 0, realmRec.Intrinsics['%Map.prototype%'], [
    [wellKnownSymbols.species, [Map_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
