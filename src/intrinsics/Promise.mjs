import {
  surroundingAgent,
} from '../engine.mjs';
import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Assert,
  Call,
  Invoke,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateResolvingFunctions,
  Get,
  GetIterator,
  IsCallable,
  IsConstructor,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  NewPromiseCapability,
  OrdinaryCreateFromConstructor,
  PromiseResolve,
  SetFunctionLength,
  SetFunctionName,
  PromiseCapabilityRecord,
} from '../abstract-ops/all.mjs';
import {
  Q,
  Completion,
  AbruptCompletion,
  IfAbruptRejectPromise,
  ReturnIfAbrupt,
} from '../completion.mjs';

function PromiseConstructor([executor], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'value is not a constructor');
  }
  if (IsCallable(executor).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'Promise resolver is not a function');
  }
  const promise = Q(OrdinaryCreateFromConstructor(NewTarget, '%PromisePrototype%', [
    'PromiseState',
    'PromiseResult',
    'PromiseFulfillReactions',
    'PromiseRejectReactions',
    'PromiseIsHandled',
  ]));
  promise.PromiseState = 'pending';
  promise.PromiseFulfillReactions = [];
  promise.PromiseRejectReactions = [];
  promise.PromiseIsHandled = false;
  const resolvingFunctions = CreateResolvingFunctions(promise);
  const completion = Call(executor, NewValue(undefined), [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (completion instanceof AbruptCompletion) {
    Q(Call(resolvingFunctions.Reject, NewValue(undefined), [completion.Value]));
  }
  return promise;
}

// #sec-promise.all-resolve-element-functions
function PromiseAllResolveElementFunctions([x]) {
  const F = surroundingAgent.activeFunctionObject;

  const alreadyCalled = F.AlreadyCalled;
  if (alreadyCalled.Value === true) {
    return NewValue(undefined);
  }
  alreadyCalled.Value = true;
  const index = F.Index;
  const values = F.Values;
  const promiseCapability = F.Capability;
  const remainingElementsCount = F.RemainingElements;
  values[index] = x;
  remainingElementsCount.Value -= 1;
  if (remainingElementsCount.Value === 0) {
    const valuesArray = CreateArrayFromList(values);
    return Q(Call(promiseCapability.Resolve, NewValue(undefined), [valuesArray]));
  }
  return NewValue(undefined);
}

// #sec-performpromiseall
function PerformPromiseAll(iteratorRecord, constructor, resultCapability) {
  Assert(IsConstructor(constructor).isTrue());
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  const values = [];
  const remainingElementsCount = { Value: 1 };
  let index = 0;
  while (true) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (Type(next) === 'Boolean' && next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount === 0) {
        const valuesArray = CreateArrayFromList(values);
        Q(Call(resultCapability.Resolve), NewValue(undefined), [valuesArray]);
      }
      return resultCapability.Promise;
    }
    const nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(nextValue);
    values.push(NewValue(undefined));
    const nextPromise = Q(Invoke(constructor, NewValue('resolve'), [nextValue]));
    const steps = PromiseAllResolveElementFunctions;
    const resolveElement = CreateBuiltinFunction(steps, [
      'AlreadyCalled', 'Index', 'Values', 'Capability', 'RemainingElements',
    ]);
    resolveElement.AlreadyCalled = { Value: false };
    resolveElement.Index = index;
    resolveElement.Values = values;
    resolveElement.Capability = resultCapability;
    resolveElement.RemainingElements = remainingElementsCount;
    remainingElementsCount.Value += 1;
    Q(Invoke(nextPromise, NewValue('then'), [resolveElement, resultCapability.Reject]));
    index += 1;
  }
}

function Promise_all([iterable], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  const iteratorRecord = GetIterator(iterable);
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  let result = PerformPromiseAll(iteratorRecord, C, promiseCapability);
  if (result instanceof AbruptCompletion) {
    if (iteratorRecord.Done.isFalse()) {
      result = IteratorClose(iteratorRecord, result);
    }
    IfAbruptRejectPromise(result, promiseCapability);
  }
  return Completion(result);
}

function Promise_race() {
  return NewValue(undefined);
}

function Promise_reject([r], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const promiseCapability = NewPromiseCapability(C);
  Q(Call(promiseCapability.Reject, NewValue(undefined), [r]));
  return promiseCapability.Promise;
}

function Promise_resolve([x], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(PromiseResolve(C, x));
}

function Promise_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreatePromise(realmRec) {
  const promiseConstructor = CreateBuiltinFunction(PromiseConstructor, [], realmRec);
  SetFunctionName(promiseConstructor, NewValue('Promise'));
  SetFunctionLength(promiseConstructor, NewValue(1));

  const proto = realmRec.Intrinsics['%PromisePrototype%'];

  promiseConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: promiseConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  [
    ['all', Promise_all, 1],
    ['race', Promise_race, 1],
    ['reject', Promise_reject, 1],
    ['resolve', Promise_resolve, 1],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    promiseConstructor.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  promiseConstructor.DefineOwnProperty(wellKnownSymbols.species, {
    Get: CreateBuiltinFunction(Promise_symbolSpecies, [], realmRec),
    Set: NewValue(undefined),
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%Promise_all%'] = Get(promiseConstructor, NewValue('all'));
  realmRec.Intrinsics['%Promise_reject%'] = Get(promiseConstructor, NewValue('reject'));
  realmRec.Intrinsics['%Promise_resolve%'] = Get(promiseConstructor, NewValue('resolve'));

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
}
