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
  CreateDataProperty,
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
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  PromiseCapabilityRecord,
  PromiseResolve,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion, Completion,
  IfAbruptRejectPromise,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';


function PromiseConstructor([executor = Value.undefined], { NewTarget }) {
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorRequiresNew', 'Promise');
  }
  if (IsCallable(executor) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', executor);
  }
  const promise = Q(OrdinaryCreateFromConstructor(NewTarget, '%Promise.prototype%', [
    'PromiseState',
    'PromiseResult',
    'PromiseFulfillReactions',
    'PromiseRejectReactions',
    'PromiseIsHandled',
  ]));
  promise.PromiseState = 'pending';
  promise.PromiseFulfillReactions = [];
  promise.PromiseRejectReactions = [];
  promise.PromiseIsHandled = Value.false;
  const resolvingFunctions = CreateResolvingFunctions(promise);
  const completion = Call(executor, Value.undefined, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  if (completion instanceof AbruptCompletion) {
    Q(Call(resolvingFunctions.Reject, Value.undefined, [completion.Value]));
  }
  return promise;
}

// 25.6.4.1.2 #sec-promise.all-resolve-element-functions
function PromiseAllResolveElementFunctions([x = Value.undefined]) {
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

// 25.6.4.1.1 #sec-performpromiseall
function PerformPromiseAll(iteratorRecord, constructor, resultCapability) {
  Assert(IsConstructor(constructor) === Value.true);
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  const values = [];
  const remainingElementsCount = { Value: 1 };
  const promiseResolve = Q(Get(constructor, new Value('resolve')));
  if (IsCallable(promiseResolve) === Value.alse) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', promiseResolve);
  }
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
    const nextPromise = Q(Call(promiseResolve, constructor, [nextValue]));
    const steps = PromiseAllResolveElementFunctions;
    const resolveElement = X(CreateBuiltinFunction(steps, [
      'AlreadyCalled', 'Index', 'Values', 'Capability', 'RemainingElements',
    ]));
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

function Promise_all([iterable = Value.undefined], { thisValue }) {
  const C = thisValue;
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

function PromiseAllSettledResolveElementFunctions([x = Value.undefined]) {
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
  const obj = X(ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%')));
  X(CreateDataProperty(obj, new Value('status'), new Value('fulfilled')));
  X(CreateDataProperty(obj, new Value('value'), x));
  values[index] = obj;
  remainingElementsCount.Value -= 1;
  if (remainingElementsCount.Value === 0) {
    const valuesArray = X(CreateArrayFromList(values));
    return Q(Call(promiseCapability.Resolve, Value.undefined, [valuesArray]));
  }
  return Value.undefined;
}

function PromiseAllSettledRejectElementFunctions([x = Value.undefined]) {
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
  const obj = X(ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%')));
  X(CreateDataProperty(obj, new Value('status'), new Value('rejected')));
  X(CreateDataProperty(obj, new Value('reason'), x));
  values[index] = obj;
  remainingElementsCount.Value -= 1;
  if (remainingElementsCount.Value === 0) {
    const valuesArray = X(CreateArrayFromList(values));
    return Q(Call(promiseCapability.Resolve, Value.undefined, [valuesArray]));
  }
  return Value.undefined;
}

function PerformPromiseAllSettled(iteratorRecord, constructor, resultCapability) {
  Assert(X(IsConstructor(constructor) === Value.true));
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  const promiseResolve = Q(Get(constructor, new Value('resolve')));
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
        const valuesArray = X(CreateArrayFromList(values));
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
    const nextPromise = Q(Call(promiseResolve, constructor, [nextValue]));
    const steps = PromiseAllSettledResolveElementFunctions;
    const resolveElement = X(CreateBuiltinFunction(steps, [
      'AlreadyCalled',
      'Index',
      'Values',
      'Capability',
      'RemainingElements',
    ]));
    X(SetFunctionLength(resolveElement, new Value(1)));
    const alreadyCalled = { Value: false };
    resolveElement.AlreadyCalled = alreadyCalled;
    resolveElement.Index = index;
    resolveElement.Values = values;
    resolveElement.Capability = resultCapability;
    resolveElement.RemainingElements = remainingElementsCount;
    const rejectSteps = PromiseAllSettledRejectElementFunctions;
    const rejectElement = X(CreateBuiltinFunction(rejectSteps, [
      'AlreadyCalled',
      'Index',
      'Values',
      'Capability',
      'RemainingElements',
    ]));
    X(SetFunctionLength(rejectElement, new Value(1)));
    rejectElement.AlreadyCalled = alreadyCalled;
    rejectElement.Index = index;
    rejectElement.Values = values;
    rejectElement.Capability = resultCapability;
    rejectElement.RemainingElements = remainingElementsCount;
    remainingElementsCount.Value += 1;
    Q(Invoke(nextPromise, new Value('then'), [resolveElement, rejectElement]));
    index += 1;
  }
}

function Promise_allSettled([iterable = Value.undefined], { thisValue }) {
  const C = thisValue;
  const promiseCapability = Q(NewPromiseCapability(C));
  const iteratorRecord = GetIterator(iterable);
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  let result = PerformPromiseAllSettled(iteratorRecord, C, promiseCapability);
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
  const promiseResolve = Q(Get(constructor, new Value('resolve')));
  if (IsCallable(promiseResolve) === Value.alse) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', promiseResolve);
  }
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
    const nextPromise = Q(Call(promiseResolve, constructor, [nextValue]));
    Q(Invoke(nextPromise, new Value('then'), [resultCapability.Resolve, resultCapability.Reject]));
  }
}

function Promise_race([iterable = Value.undefined], { thisValue }) {
  const C = thisValue;
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

function Promise_reject([r = Value.undefined], { thisValue }) {
  const C = thisValue;
  const promiseCapability = Q(NewPromiseCapability(C));
  Q(Call(promiseCapability.Reject, Value.undefined, [r]));
  return promiseCapability.Promise;
}

function Promise_resolve([x = Value.undefined], { thisValue }) {
  const C = thisValue;
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Promise.resolve', C);
  }
  return Q(PromiseResolve(C, x));
}

function Promise_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreatePromise(realmRec) {
  const promiseConstructor = BootstrapConstructor(realmRec, PromiseConstructor, 'Promise', 1, realmRec.Intrinsics['%Promise.prototype%'], [
    ['all', Promise_all, 1],
    ['allSettled', Promise_allSettled, 1],
    ['race', Promise_race, 1],
    ['reject', Promise_reject, 1],
    ['resolve', Promise_resolve, 1],
    [wellKnownSymbols.species, [Promise_symbolSpecies]],
  ]);

  promiseConstructor.DefineOwnProperty(new Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  realmRec.Intrinsics['%Promise.all%'] = X(Get(promiseConstructor, new Value('all')));
  realmRec.Intrinsics['%Promise.reject%'] = X(Get(promiseConstructor, new Value('reject')));
  realmRec.Intrinsics['%Promise.resolve%'] = X(Get(promiseConstructor, new Value('resolve')));

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
}
