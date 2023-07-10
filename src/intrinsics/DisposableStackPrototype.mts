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
import { NormalCompletion, Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { unwind } from '../helpers.mjs';
import {
  Descriptor, ObjectValue, Value, wellKnownSymbols,
} from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';
import type { DisposableStackObjectValue } from './DisposableStack.mjs';

/** https://tc39.es/proposal-explicit-resource-management/#sec-get-disposablestack.prototype.disposed */
function DisposableStack_disposedGetter(_: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, return true.
  if (disposableStack.DisposableState === 'disposed') {
    return Value.true;
  }
  // 4. Otherwise, return false.
  return Value.false;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack.prototype.dispose */
function DisposableStack_dispose(_: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, return undefined.
  if (disposableStack.DisposableState === 'disposed') {
    return Value.undefined;
  }
  // 4. Set disposableStack.[[DisposableState]] to disposed.
  disposableStack.DisposableState = 'disposed';
  // 5. Return DisposeResources(disposableStack.[[DisposeCapability]], NormalCompletion(undefined)).
  return unwind(DisposeResources(disposableStack.DisposeCapability, NormalCompletion(Value.undefined)));
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack.prototype.use */
function DisposableStack_use([value = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, throw a ReferenceError exception.
  if (disposableStack.DisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. Perform ? AddDisposableResource(disposableStack.[[DisposeCapability]], value, sync-dispose).
  Q(AddDisposableResource(disposableStack.DisposeCapability, value, 'sync-dispose'));
  // 5. Return value.
  return value;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack.prototype.adopt */
function DisposableStack_adopt([value = Value.undefined, onDispose = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, throw a ReferenceError exception.
  if (disposableStack.DisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. If IsCallable(onDispose) is false, throw a TypeError exception.
  if (IsCallable(onDispose) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', onDispose);
  }

  // NOTE: Current spec text
  // // 5. Let F be a new built-in function object as defined in 12.3.3.4.1.
  // const F = CreateBuiltinFunction(DisposableStackAdoptCallbackFunctions, 0, Value(''), ['Argument', 'OnDisposeCallback']);
  // // 6. Set F.[[Argument]] to value.
  // F.Argument = value;
  // // 7. Set F.[[OnDisposeCallback]] to onDispose.
  // F.OnDisposeCallback = onDispose as ObjectValue;
  // // 8. Perform ? AddDisposableResource(disposableStack.[[DisposeCapability]], undefined, sync-dispose, F).
  // Q(AddDisposableResource(disposableStack.DisposeCapability, Value.undefined, "sync-dispose", F));
  // // 9. Return value.
  // return value;

  // TODO(rbuckton): Switch spec to use abstract closure as follows:
  // 5. Let closure be a new Abstract Closure with no parameters that captures value and onDispose and performs the following steps when called:
  const closure = (_: ArgumentList) => {
    // a. Perform ? Call(onDispose, undefined, « value »).
    Q(Call(onDispose, Value.undefined, [value]));
    // b. Return undefined.
    return Value.undefined;
  };
    // 6. Let F be CreateBuiltinFunction(closure, 0, "", « »).
  const F = CreateBuiltinFunction(closure, 0, Value(''), []);
  // 7. Perform ? AddDisposableResource(asyncDisposableStack.[[DisposeCapability]], undefined, async-dispose, F).
  Q(AddDisposableResource(disposableStack.DisposeCapability, Value.undefined, 'sync-dispose', F));
  // 8. Return value.
  return value;
}

// type DisposableStackAdoptCallbackFunctionsObjectValue = BuiltinFunctionObjectValue<{
//     Argument: Value;
//     OnDisposeCallback: ObjectValue;
// }>;

// /** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack-adopt-callback-functions */
// function DisposableStackAdoptCallbackFunctions(_: ArgumentList, {}: NativeFunctionContext) {
//     // 1. Let F be the active function object.
//     const F = surroundingAgent.activeFunctionObject as DisposableStackAdoptCallbackFunctionsObjectValue;
//     // 2. Assert: IsCallable(F.[[OnDisposeCallback]]) is true.
//     Assert(IsCallable(F.OnDisposeCallback) === Value.true);
//     // 3. Return Call(F.[[OnDisposeCallback]], undefined, « F.[[Argument]] »).
//     return Call(F.OnDisposeCallback, Value.undefined, [F.Argument]);
// }

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack.prototype.defer */
function DisposableStack_defer([onDispose = Value.undefined]: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, throw a ReferenceError exception.
  if (disposableStack.DisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. If IsCallable(onDispose) is false, throw a TypeError exception.
  if (IsCallable(onDispose) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', onDispose);
  }
  // 5. Perform ? AddDisposableResource(disposableStack.[[DisposeCapability]], undefined, sync-dispose, onDispose).
  Q(AddDisposableResource(disposableStack.DisposeCapability, Value.undefined, 'sync-dispose', onDispose as ObjectValue));
  // 6. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-disposablestack.prototype.move */
function DisposableStack_move(_: ArgumentList, { thisValue }: NativeFunctionContext) {
  // 1. Let disposableStack be the this value.
  const disposableStack = thisValue as DisposableStackObjectValue;
  // 2. Perform ? RequireInternalSlot(disposableStack, [[DisposableState]]).
  Q(RequireInternalSlot(disposableStack, 'DisposableState'));
  // 3. If disposableStack.[[DisposableState]] is disposed, throw a ReferenceError exception.
  if (disposableStack.DisposableState === 'disposed') {
    return surroundingAgent.Throw('ReferenceError', 'ObjectIsDisposed');
  }
  // 4. Let newDisposableStack be ? OrdinaryCreateFromConstructor(%DisposableStack%, "%DisposableStack.prototype%", « [[DisposableState]], [[DisposeCapability]] »).
  const newDisposableStack = Q(OrdinaryCreateFromConstructor(surroundingAgent.intrinsic('%DisposableStack%'), '%DisposableStack.prototype%', ['DisposableState', 'DisposeCapability']));
  // 5. Set newDisposableStack.[[DisposableState]] to pending.
  newDisposableStack.DisposableState = 'pending';
  // 6. Set newDisposableStack.[[DisposeCapability]] to disposableStack.[[DisposeCapability]].
  newDisposableStack.DisposeCapability = disposableStack.DisposeCapability;
  // 7. Set disposableStack.[[DisposeCapability]] to NewDisposeCapability().
  disposableStack.DisposeCapability = NewDisposeCapability();
  // 8. Set disposableStack.[[DisposableState]] to disposed.
  disposableStack.DisposableState = 'disposed';
  // 9. Return newDisposableStack.
  return newDisposableStack;
}

export function bootstrapDisposableStackPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['disposed', [DisposableStack_disposedGetter]],
    ['dispose', DisposableStack_dispose, 0],
    ['use', DisposableStack_use, 1],
    ['adopt', DisposableStack_adopt, 2],
    ['defer', DisposableStack_defer, 1],
    ['move', DisposableStack_move, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'DisposableStack');

  const disposeFunc = X(proto.GetOwnProperty(Value('dispose'))) as Descriptor;
  X(proto.DefineOwnProperty(wellKnownSymbols.dispose, disposeFunc));

  realmRec.Intrinsics['%DisposableStack.prototype%'] = proto;
}
