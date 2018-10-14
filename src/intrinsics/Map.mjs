import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  AbruptCompletion, Q,
  ThrowCompletion,
  X,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function AddEntriesFromIterable(target, iterable, adder) {
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  Assert(iterable && Type(iterable) !== 'Undefined' && Type(iterable) !== 'Null');
  const iteratorRecord = Q(GetIterator(iterable));
  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (next === Value.false) {
      return target;
    }
    const nextItem = Q(IteratorValue(next));
    if (Type(nextItem) !== 'Object') {
      const error = new ThrowCompletion(surroundingAgent.Throw('TypeError').Value);
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

function MapConstructor([iterable], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'undefined is not a constructor');
  }
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%MapPrototype%', ['MapData']));
  map.MapData = [];
  if (iterable === undefined || Type(iterable) === 'Undefined' || Type(iterable) === 'Null') {
    return map;
  }
  const adder = Q(Get(map, new Value('set')));
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

export function CreateMap(realmRec) {
  const mapConstructor = BootstrapConstructor(realmRec, MapConstructor, 'Map', 1, realmRec.Intrinsics['%MapPrototype%'], []);

  X(mapConstructor.DefineOwnProperty(wellKnownSymbols.species, Descriptor({
    Get: CreateBuiltinFunction((a, { thisValue }) => thisValue, [], realmRec),
    Set: Value.undefined,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
