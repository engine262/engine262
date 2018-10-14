import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Assert,
  Call,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateResolvingFunctions,
  Get,
  GetIterator,
  Invoke,
  IsCallable,
  IsConstructor,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  NewPromiseCapability,
  OrdinaryCreateFromConstructor,
  PromiseCapabilityRecord,
  PromiseResolve,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion, Completion,
  IfAbruptRejectPromise,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function PromiseConstructor([executor], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'value is not a constructor');
  }
  if (IsCallable(executor) === Value.false) {
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
  const completion = Call(executor, Value.undefined, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (completion instanceof AbruptCompletion) {
    Q(Call(resolvingFunctions.Reject, Value.undefined, [completion.Value]));
  }
  return promise;
}

// #sec-promise.all-resolve-element-functions
function PromiseAllResolveElementFunctions([x]) {
  const F = surroundingAgent.activeFunctionObject;
  const alreadyCalled = F.AlreadyCalled;
  if (alreadyCalled.Value === true) {
    return Value.undefined;
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
    return Q(Call(promiseCapability.Resolve, Value.undefined, [valuesArray]));
  }
  return Value.undefined;
}

// #sec-performpromiseall
function PerformPromiseAll(iteratorRecord, constructor, resultCapability) {
  Assert(IsConstructor(constructor) === Value.true);
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  const values = [];
  const remainingElementsCount = { Value: 1 };
  let index = 0;
  while (true) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount.Value === 0) {
        const valuesArray = CreateArrayFromList(values);
        Q(Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      return resultCapability.Promise;
    }
    const nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(nextValue);
    values.push(Value.undefined);
    const nextPromise = Q(Invoke(constructor, new Value('resolve'), [nextValue]));
    const steps = PromiseAllResolveElementFunctions;
    const resolveElement = CreateBuiltinFunction(steps, [
      'AlreadyCalled', 'Index', 'Values', 'Capability', 'RemainingElements',
    ]);
    X(SetFunctionLength(resolveElement, new Value(1)));
    resolveElement.AlreadyCalled = { Value: false };
    resolveElement.Index = index;
    resolveElement.Values = values;
    resolveElement.Capability = resultCapability;
    resolveElement.RemainingElements = remainingElementsCount;
    remainingElementsCount.Value += 1;
    Q(Invoke(nextPromise, new Value('then'), [resolveElement, resultCapability.Reject]));
    index += 1;
  }
}

function Promise_all([iterable], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Promise.all called on non-object');
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  const iteratorRecord = GetIterator(iterable);
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  let result = PerformPromiseAll(iteratorRecord, C, promiseCapability);
  if (result instanceof AbruptCompletion) {
    if (iteratorRecord.Done === Value.false) {
      result = IteratorClose(iteratorRecord, result);
    }
    IfAbruptRejectPromise(result, promiseCapability);
  }
  return Completion(result);
}

function PerformPromiseRace(iteratorRecord, constructor, resultCapability) {
  Assert(IsConstructor(constructor) === Value.true);
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  while (true) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
      return resultCapability.Promise;
    }
    const nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(nextValue);
    const nextPromise = Q(Invoke(constructor, new Value('resolve'), [nextValue]));
    Q(Invoke(nextPromise, new Value('then'), [resultCapability.Resolve, resultCapability.Reject]));
  }
}

function Promise_race([iterable], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Promise.race called on non-object');
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  const iteratorRecord = GetIterator(iterable);
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  let result = PerformPromiseRace(iteratorRecord, C, promiseCapability);
  if (result instanceof AbruptCompletion) {
    if (iteratorRecord.Done === Value.false) {
      result = IteratorClose(iteratorRecord, result);
    }
    IfAbruptRejectPromise(result, promiseCapability);
  }
  return Completion(result);
}

function Promise_reject([r], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Promise.reject called on non-object');
  }
  const promiseCapability = Q(NewPromiseCapability(C));
  Q(Call(promiseCapability.Reject, Value.undefined, [r]));
  return promiseCapability.Promise;
}

function Promise_resolve([x], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Promise.resolve called on non-object');
  }
  return Q(PromiseResolve(C, x));
}

function Promise_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreatePromise(realmRec) {
  const promiseConstructor = BootstrapConstructor(realmRec, PromiseConstructor, 'Promise', 1, realmRec.Intrinsics['%PromisePrototype%'], [
    ['all', Promise_all, 1],
    ['race', Promise_race, 1],
    ['reject', Promise_reject, 1],
    ['resolve', Promise_resolve, 1],
  ]);

  {
    const fn = CreateBuiltinFunction(Promise_symbolSpecies, [], realmRec);
    X(SetFunctionName(fn, wellKnownSymbols.species, new Value('get')));
    X(SetFunctionLength(fn, new Value(0)));
    promiseConstructor.DefineOwnProperty(wellKnownSymbols.species, Descriptor({
      Get: fn,
      Set: Value.undefined,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  }

  promiseConstructor.DefineOwnProperty(new Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  realmRec.Intrinsics['%Promise_all%'] = Get(promiseConstructor, new Value('all'));
  realmRec.Intrinsics['%Promise_reject%'] = Get(promiseConstructor, new Value('reject'));
  realmRec.Intrinsics['%Promise_resolve%'] = Get(promiseConstructor, new Value('resolve'));

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
}
