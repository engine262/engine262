import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  CreateBuiltinFunction,
  Get,
  GetIterator,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  AbruptCompletion, Q,
  X,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { msg } from '../helpers.mjs';

function SetConstructor([iterable], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', NewTarget));
  }
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%SetPrototype%', ['SetData']));
  set.SetData = [];
  if (iterable === undefined || Type(iterable) === 'Undefined' || Type(iterable) === 'Null') {
    return set;
  }
  const adder = Q(Get(set, new Value('add')));
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  const iteratorRecord = Q(GetIterator(iterable));

  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (next === Value.false) {
      return set;
    }
    const nextValue = Q(IteratorValue(next));
    const status = Call(adder, set, [nextValue]);
    if (status instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, status));
    }
  }
}

function Set_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreateSet(realmRec) {
  const setConstructor = BootstrapConstructor(realmRec, SetConstructor, 'Set', 0, realmRec.Intrinsics['%SetPrototype%'], []);

  {
    const fn = CreateBuiltinFunction(Set_symbolSpecies, [], realmRec);
    X(SetFunctionLength(fn, new Value(0)));
    X(SetFunctionName(fn, wellKnownSymbols.species, new Value('get')));
    X(setConstructor.DefineOwnProperty(wellKnownSymbols.species, Descriptor({
      Get: fn,
      Set: Value.undefined,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  realmRec.Intrinsics['%Set%'] = setConstructor;
}
