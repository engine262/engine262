// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Completion,
  EnsureCompletion,
  IfAbruptRejectPromise,
  Q, X,
  Await,
  NormalCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import {
  Assert,
  Call,
  CreateDataProperty,
  Get,
  GetMethod,
  GetV,
  PromiseResolve,
  OrdinaryObjectCreate,
  PerformPromiseThen,
  ToBoolean,
  Yield,
  CreateIteratorFromClosure,
  IsCallable,
  CreateMethodProperty,
} from './all.mjs';

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposecapability-records */
export class DisposeCapabilityRecord {
  DisposableResourceStack: DisposableResourceRecord[];

  constructor({
    DisposableResourceStack,
  }: Pick<DisposeCapabilityRecord, 'DisposableResourceStack'>) {
    this.DisposableResourceStack = DisposableResourceStack;
  }
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposableresource-records */
export class DisposableResourceRecord {
  ResourceValue: ObjectValue | undefined;
  Hint: 'sync-dispose' | 'async-dispose';
  DisposeMethod: ObjectValue;

  constructor({
    ResourceValue,
    Hint,
    DisposeMethod,
  }: Pick<DisposableResourceRecord, 'ResourceValue' | 'Hint' | 'DisposeMethod'>) {
    this.ResourceValue = ResourceValue;
    this.Hint = Hint;
    this.DisposeMethod = DisposeMethod;
  }
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-newdisposecapability */
export function NewDisposeCapability() {
  // 1. Let stack be a new empty List.
  const stack = [];
  // 2. Return the DisposeCapability Record { [[DisposableResourceStack]]: stack }.
  return new DisposeCapabilityRecord({ DisposableResourceStack: stack });
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-adddisposableresource */
export function AddDisposableResource(disposeCapability: DisposeCapabilityRecord, V: Value, hint: 'sync-dispose' | 'async-dispose', method?: ObjectValue) {
  let resource: DisposableResourceRecord;
  // 1. If method is not present, then
  if (method === undefined) {
    // a. If V is either null or undefined, return unused.
    if ((V === Value.null || V === Value.undefined) && hint === 'sync-dispose') {
      return;
    }
    // b. Let resource be ? CreateDisposableResource(V, hint).
    resource = Q(CreateDisposableResource(V, hint));
  } else { // 2. Else,
    // a. Assert: V is undefined.
    Assert(V === Value.undefined);
    // b. Let resource be ? CreateDisposableResource(undefined, hint, method).
    resource = Q(CreateDisposableResource(Value.undefined, hint, method));
  }
  // 3. Append resource to disposeCapability.[[DisposableResourceStack]].
  disposeCapability.DisposableResourceStack.push(resource);
  // 4. Return unused.
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-createdisposableresource */
export function CreateDisposableResource(V: ObjectValue | UndefinedValue, hint: 'sync-dispose' | 'async-dispose', method?: ObjectValue) {
  // TODO(rbuckton): Fix the spec text, this wasn't correctly copied from the async proposal
  // 1. If method is not present, then
  if (method === undefined) {
    // a. If V is either null or undefined, then
    if (V === Value.null || V === Value.undefined) {
      // i. Set V to undefined
      V = Value.undefined;
      // ii. Set method to undefined
      method = Value.undefined;
    } else { // b. Else,
      // i. If V is not an Object, throw a TypeError exception.
      if (!(V instanceof ObjectValue)) {
        return surroundingAgent.Throw('TypeError', 'NotAnObject', V);
      }
      // ii. Set method to ? GetDisposeMethod(V, hint).
      method = Q(GetDisposeMethod(V, hint));
      // iii. If method is undefined, throw a TypeError exception.
      if (method === Value.undefined) {
        return surroundingAgent.Throw('TypeError', 'NotAFunction', method);
      }
    }
  } else { // 2. Else,
    // a. If IsCallable(method) is false, throw a TypeError exception.
    if (IsCallable(method) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', method);
    }
  }
  // 3. Return the DisposableResource Record { [[ResourceValue]]: V, [[Hint]]: hint, [[DisposeMethod]]: method }.
  return new DisposableResourceRecord({ ResourceValue: V, Hint: hint, DisposeMethod: method });
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-getdisposemethod */
export function GetDisposeMethod(V: ObjectValue, hint: 'sync-dispose' | 'async-dispose') {
  let method: ObjectValue | UndefinedValue;
  // 1. If hint is async-dispose, then
  if (hint === 'async-dispose') {
    // a. Let method be ? GetMethod(V, @@asyncDispose).
    method = Q(GetMethod(V, wellKnownSymbols.asyncDispose));
    // b. If method is undefined, then
    if (method === Value.undefined) {
      // i. Set method to ? GetMethod(V, @@dispose).
      method = Q(GetMethod(V, wellKnownSymbols.dispose));
    }
  } else { // 2. Else,
    // a. Let method be ? GetMethod(V, @@dispose).
    method = Q(GetMethod(V, wellKnownSymbols.dispose));
  }
  // 3. Return method.
  return method;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-dispose */
export function* Dispose(V: ObjectValue | UndefinedValue, hint: 'sync-dispose' | 'async-dispose', method: ObjectValue): Generator<Value, Completion<Value>, Completion<Value>> {
  let result: Value;
  // 1. If method is undefined, let result be undefined.
  if (method === Value.undefined) {
    result = Value.undefined;
  } else { // 2. Else, let result be ? Call(method, V).
    result = Q(Call(method, V, []));
  }
  // 3. If hint is async-dispose, then
  if (hint === 'async-dispose') {
    // a. Perform ? Await(result).
    Q(yield* Await(result));
  }
  // 4. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposeresources */
export function* DisposeResources(disposeCapability: DisposeCapabilityRecord, completion: Completion<Value>): Generator<Value, Completion<Value>, Completion<Value>> {
  // 1. For each resource of disposeCapability.[[DisposableResourceStack]], in reverse List order, do
  for (const resource of [...disposeCapability.DisposableResourceStack].reverse()) {
    // a. Let result be Dispose(resource.[[ResourceValue]], resource.[[Hint]], resource.[[DisposeMethod]]).
    let result = EnsureCompletion(yield* Dispose(resource.ResourceValue, resource.Hint, resource.DisposeMethod));
    // b. If result.[[Type]] is throw, then
    if (result.Type === 'throw') {
      // i. If completion.[[Type]] is throw, then
      if (completion.Type === 'throw') {
        // 1. Set result to result.[[Value]].
        result = result.Value;
        // 2. Let suppressed be completion.[[Value]].
        const suppressed = completion.Value;
        // 3. Let error be a newly created SuppressedError object.
        const error = surroundingAgent.Throw('SuppressedError', 'DisposalErrorSuppression').Value;
        // 4. Perform ! CreateNonEnumerableDataPropertyOrThrow(error, "error", result).
        X(CreateMethodProperty(error, Value('error'), result));
        // 5. Perform ! CreateNonEnumerableDataPropertyOrThrow(error, "suppressed", suppressed).
        X(CreateMethodProperty(error, Value('suppressed'), suppressed));
        // 6. Set completion to ThrowCompletion(error).
        completion = ThrowCompletion(error);
      } else { // ii. Else,
        // 1. Set completion to result.
        completion = result;
      }
    }
  }
  // 2. Return completion.
  return completion;
}
