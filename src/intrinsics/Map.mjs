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
  CreateBuiltinFunction,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  Descriptor,
  wellKnownSymbols,
} from '../value.mjs';
import {
  AbruptCompletion,
  ThrowCompletion,
  Q, X,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { msg } from '../helpers.mjs';

export function AddEntriesFromIterable(target, iterable, adder) {
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
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', NewTarget));
  }
  const map = Q(OrdinaryCreateFromConstructor(NewTarget, '%MapPrototype%', ['MapData']));
  map.MapData = [];
  if (iterable === undefined || Type(iterable) === 'Undefined' || Type(iterable) === 'Null') {
    return map;
  }
  const adder = Q(Get(map, new Value('set')));
  return Q(AddEntriesFromIterable(map, iterable, adder));
}

function Map_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreateMap(realmRec) {
  const mapConstructor = BootstrapConstructor(realmRec, MapConstructor, 'Map', 0, realmRec.Intrinsics['%MapPrototype%'], []);

  {
    const fn = CreateBuiltinFunction(Map_symbolSpecies, [], realmRec);
    X(SetFunctionLength(fn, new Value(0)));
    X(SetFunctionName(fn, wellKnownSymbols.species, new Value('get')));
    X(mapConstructor.DefineOwnProperty(wellKnownSymbols.species, Descriptor({
      Get: fn,
      Set: Value.undefined,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  realmRec.Intrinsics['%Map%'] = mapConstructor;
}
