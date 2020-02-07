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
import { BootstrapConstructor } from './Bootstrap.mjs';


function SetConstructor([iterable = Value.undefined], { NewTarget }) {
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorRequiresNew', 'Set');
  }
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%Set.prototype%', ['SetData']));
  set.SetData = [];
  if (iterable === Value.undefined || iterable === Value.null) {
    return set;
  }
  const adder = Q(Get(set, new Value('add')));
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
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

function Set_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function BootstrapSet(realmRec) {
  const setConstructor = BootstrapConstructor(realmRec, SetConstructor, 'Set', 0, realmRec.Intrinsics['%Set.prototype%'], [
    [wellKnownSymbols.species, [Set_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Set%'] = setConstructor;
}
