import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Call,
  Get,
  CreateBuiltinFunction,
  OrdinaryCreateFromConstructor,
  IsCallable,
  GetIterator,
  IteratorClose,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { Type, New as NewValue, wellKnownSymbols } from '../value.mjs';
import {
  Q, X,
  ThrowCompletion, AbruptCompletion,
} from '../completion.mjs';

function AddEntriesFromIterable(target, iterable, adder) {
  if (IsCallable(adder).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  Assert(iterable && Type(iterable) !== 'Undefined' && Type(iterable) !== 'Null');
  const iteratorRecord = Q(GetIterator(iterable));
  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (Type(next) === 'Boolean' && next.isFalse()) {
      return target;
    }
    const nextItem = Q(IteratorValue(next));
    if (Type(nextItem) !== 'Object') {
      const error = new ThrowCompletion(surroundingAgent.Throw('TypeError').Value);
      return Q(IteratorClose(iteratorRecord, error));
    }
    const k = Get(nextItem, NewValue('0'));
    if (k instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, k));
    }
    const v = Get(nextItem, NewValue('1'));
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
  const adder = Q(Get(map, NewValue('set')));
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

export function CreateMap(realmRec) {
  const mapConstructor = CreateBuiltinFunction(MapConstructor, [], realmRec);

  const proto = realmRec.Intrinsics['%MapPrototype%'];
  X(proto.DefineOwnProperty(NewValue('prototype'), {
    Value: mapConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  }));

  X(mapConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  X(mapConstructor.DefineOwnProperty(wellKnownSymbols.species, {
    Get: CreateBuiltinFunction((a, { thisValue }) => thisValue, [], realmRec),
    Set: NewValue(undefined),
    Enumerable: false,
    Configurable: true,
  }));

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
