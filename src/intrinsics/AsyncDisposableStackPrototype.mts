import {
  AddDisposableResource,
  Call,
  CreateBuiltinFunction,
  DisposeResources,
  IsCallable,
  NewDisposeCapability,
  OrdinaryCreateFromConstructor,
  RequireInternalSlot,
  type ArgumentList,
  type NativeFunctionContext,
  type Realm,
} from '../abstract-ops/all.mjs';
import {
  Completion, NormalCompletion, Q, X,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Descriptor, ObjectValue, Value, wellKnownSymbols,
} from '../value.mjs';
import type { AsyncDisposableStackObjectValue } from './AsyncDisposableStack.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/proposal-explicit-resource-management/#sec-get-asyncdisposablestack.prototype.disposed */
function AsyncDisposableStack_disposedGetter(_: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(asyncDisposableStack, [[AsyncDisposableState]]).
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 3. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, return true.
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    return Value.true;
  }
  // 4. Otherwise, return false.
  return Value.false;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-asyncdisposablestack.prototype.disposeAsync */
function* AsyncDisposableStack_disposeAsync(_: ArgumentList, { thisValue }: NativeFunctionContext): Generator<Value, Completion<Value>, Completion<Value>> {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Let promiseCapability be ! NewPromiseCapability(%Promise%).
  // 3. If asyncDisposableStack does not have an [[AsyncDisposableState]] internal slot, then
  //   a. Perform ! Call(promiseCapability.[[Reject]], undefined, « a newly created TypeError object »).
  //   b. Return promiseCapability.[[Promise]].
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 4. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, then
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    // a. Perform ! Call(promiseCapability.[[Resolve]], undefined, « undefined »).
    // b. Return promiseCapability.[[Promise]].
    return NormalCompletion(Value.undefined);
  }
  // 5. Set asyncDisposableStack.[[AsyncDisposableState]] to disposed.
  asyncDisposableStack.AsyncDisposableState = 'disposed';
  // 6. Let result be DisposeResources(asyncDisposableStack.[[DisposeCapability]], NormalCompletion(undefined)).
  // 7. IfAbruptRejectPromise(result, promiseCapability).
  const result = yield* DisposeResources(asyncDisposableStack.DisposeCapability, NormalCompletion(Value.undefined));
  // 8. Perform ! Call(promiseCapability.[[Resolve]], undefined, « result »).
  // 9. Return promiseCapability.[[Promise]].
  return result as Completion<Value>;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-asyncdisposablestack.prototype.use */
function AsyncDisposableStack_use([value = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(asyncDisposableStack, [[AsyncDisposableState]]).
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 3. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, throw a ReferenceError exception.
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. Perform ? AddDisposableResource(asyncDisposableStack.[[DisposeCapability]], value, async-dispose).
  Q(AddDisposableResource(asyncDisposableStack.DisposeCapability, value, 'async-dispose'));
  // 5. Return value.
  return value;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-asyncdisposablestack.prototype.adopt */
function AsyncDisposableStack_adopt([value = Value.undefined, onDisposeAsync = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(asyncDisposableStack, [[AsyncDisposableState]]).
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 3. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, throw a ReferenceError exception.
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. If IsCallable(onDispose) is false, throw a TypeError exception.
  if (IsCallable(onDisposeAsync) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', onDisposeAsync);
  }
  // 5. Let closure be a new Abstract Closure with no parameters that captures value and onDisposeAsync and performs the following steps when called:
  const closure = (_: ArgumentList) => { // eslint-disable-line arrow-body-style
    // a. Return ? Call(onDisposeAsync, undefined, « value »).
    return Q(Call(onDisposeAsync, Value.undefined, [value]));
  };
  // 6. Let F be CreateBuiltinFunction(closure, 0, "", « »).
  const F = CreateBuiltinFunction(closure, 0, Value(''), []);
  // 7. Perform ? AddDisposableResource(asyncDisposableStack.[[DisposeCapability]], undefined, async-dispose, F).
  Q(AddDisposableResource(asyncDisposableStack.DisposeCapability, Value.undefined, 'async-dispose', F));
  // 8. Return value.
  return value;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-asyncdisposablestack.prototype.defer */
function AsyncDisposableStack_defer([onDispose = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(asyncDisposableStack, [[AsyncDisposableState]]).
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 3. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, throw a ReferenceError exception.
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. If IsCallable(onDispose) is false, throw a TypeError exception.
  if (IsCallable(onDispose) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', onDispose);
  }
  // 5. Perform ? AddDisposableResource(asyncDisposableStack.[[DisposeCapability]], undefined, async-dispose, onDispose).
  Q(AddDisposableResource(asyncDisposableStack.DisposeCapability, Value.undefined, 'async-dispose', onDispose as ObjectValue));
  // 6. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-asyncdisposablestack.prototype.move */
function AsyncDisposableStack_move(_: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let asyncDisposableStack be the this value.
  const asyncDisposableStack = thisValue as AsyncDisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(asyncDisposableStack, [[AsyncDisposableState]]).
  Q(RequireInternalSlot(asyncDisposableStack, 'AsyncDisposableState'));
  // 3. If asyncDisposableStack.[[AsyncDisposableState]] is disposed, throw a ReferenceError exception.
  if (asyncDisposableStack.AsyncDisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. Let newAsyncDisposableStack be ? OrdinaryCreateFromConstructor(%AsyncDisposableStack%, "%AsyncDisposableStack.prototype%", « [[AsyncDisposableState]], [[DisposeCapability]] »).
  const newAsyncDisposableStack = Q(OrdinaryCreateFromConstructor(surroundingAgent.intrinsic('%AsyncDisposableStack%'), '%AsyncDisposableStack.prototype%', ['AsyncDisposableState', 'DisposeCapability']));
  // 5. Set newAsyncDisposableStack.[[AsyncDisposableState]] to pending.
  newAsyncDisposableStack.AsyncDisposableState = 'pending';
  // 6. Set newAsyncDisposableStack.[[DisposeCapability]] to asyncDisposableStack.[[DisposeCapability]].
  newAsyncDisposableStack.DisposeCapability = asyncDisposableStack.DisposeCapability;
  // 7. Set asyncDisposableStack.[[DisposeCapability]] to NewDisposeCapability().
  asyncDisposableStack.DisposeCapability = NewDisposeCapability();
  // 8. Set asyncDisposableStack.[[AsyncDisposableState]] to disposed.
  asyncDisposableStack.AsyncDisposableState = 'disposed';
  // 9. Return newAsyncDisposableStack.
  return newAsyncDisposableStack;
}

export function bootstrapAsyncDisposableStackPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['disposed', [AsyncDisposableStack_disposedGetter]],
    ['disposeAsync', AsyncDisposableStack_disposeAsync, 0, {}, /* async */ true],
    ['use', AsyncDisposableStack_use, 1],
    ['adopt', AsyncDisposableStack_adopt, 2],
    ['defer', AsyncDisposableStack_defer, 1],
    ['move', AsyncDisposableStack_move, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'AsyncDisposableStack');

  const disposeAsyncFunc = X(proto.GetOwnProperty(Value('disposeAsync'))) as Descriptor;
  X(proto.DefineOwnProperty(wellKnownSymbols.asyncDispose, disposeAsyncFunc));

  realmRec.Intrinsics['%AsyncDisposableStack.prototype%'] = proto;
}
