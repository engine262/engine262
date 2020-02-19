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
  AbruptCompletion,
  Q,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

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
    const k = Get(nextItem, new Value('0'));
    if (k instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, k));
    }
    const v = Get(nextItem, new Value('1'));
    if (v instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, v));
    }
    const status = Call(adder, target, [k.Value, v.Value]);
    if (status instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, status));
    }
  }
}

function MapConstructor([iterable = Value.undefined], { NewTarget }) {
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorRequiresNew', 'Map');
  }
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%Map.prototype%', ['MapData']));
  map.MapData = [];
  if (iterable === Value.undefined || iterable === Value.null) {
    return map;
  }
  const adder = Q(Get(map, new Value('set')));
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

function Map_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function BootstrapMap(realmRec) {
  const mapConstructor = BootstrapConstructor(realmRec, MapConstructor, 'Map', 0, realmRec.Intrinsics['%Map.prototype%'], [
    [wellKnownSymbols.species, [Map_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
