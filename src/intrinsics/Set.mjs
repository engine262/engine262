import { surroundingAgent } from '../engine.mjs';
import {
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
  AbruptCompletion,
} from '../completion.mjs';

function SetConstructor([iterable], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'undefined is not a constructor');
  }
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%SetPrototype%', ['SetData']));
  set.SetData = [];
  if (iterable === undefined || Type(iterable) === 'Undefined' || Type(iterable) === 'Null') {
    return set;
  }
  const adder = Q(Get(set, NewValue('set')));
  if (IsCallable(adder).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  const iteratorRecord = Q(GetIterator(iterable));

  while (true) {
    const next = Q(IteratorStep(iteratorRecord));
    if (Type(next) === 'Boolean' && next.isFalse()) {
      return set;
    }
    const nextValue = Q(IteratorValue(next));
    const status = Call(adder, set, [nextValue.Value]);
    if (status instanceof AbruptCompletion) {
      return Q(IteratorClose(iteratorRecord, status));
    }
  }
}

export function CreateSet(realmRec) {
  const setConstructor = CreateBuiltinFunction(SetConstructor, [], realmRec);

  const proto = realmRec.Intrinsics['%SetPrototype%'];
  X(proto.DefineOwnProperty(NewValue('prototype'), {
    Value: setConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  }));

  X(setConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  X(setConstructor.DefineOwnProperty(wellKnownSymbols.species, {
    Get: CreateBuiltinFunction((a, { thisValue }) => thisValue, [], realmRec),
    Set: NewValue(undefined),
    Enumerable: false,
    Configurable: true,
  }));

  realmRec.Intrinsics['%Set%'] = setConstructor;
}
