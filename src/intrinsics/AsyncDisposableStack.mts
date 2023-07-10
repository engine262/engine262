import {
  DisposeCapabilityRecord,
  NewDisposeCapability,
  OrdinaryCreateFromConstructor,
  Realm,
  type ArgumentList,
  type NativeFunctionContext,
  type OrdinaryObjectValue,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { ObjectValue, Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

export type AsyncDisposableStackObjectValue = OrdinaryObjectValue<{
    AsyncDisposableState: 'pending' | 'disposed';
    DisposeCapability: DisposeCapabilityRecord;
}>;

/** https://tc39.es/ecma262/#sec-Asyncdisposablestack */
function AsyncDisposableStackConstructor(this: unknown, _: ArgumentList, { NewTarget }: NativeFunctionContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let AsyncdisposableStack be ? OrdinaryCreateFromConstructor(NewTarget, "%AsyncDisposableStack.prototype%", « [[AsyncDisposableState]], [[DisposeCapability]] »).
  const AsyncdisposableStack = Q(OrdinaryCreateFromConstructor(NewTarget as ObjectValue, '%AsyncDisposableStack.prototype%', ['AsyncDisposableState', 'DisposeCapability'])) as AsyncDisposableStackObjectValue;
  // 3. Set AsyncdisposableStack.[[AsyncDisposableState]] to pending.
  AsyncdisposableStack.AsyncDisposableState = 'pending';
  // 4. Set AsyncdisposableStack.[[DisposeCapability]] to NewDisposeCapability().
  AsyncdisposableStack.DisposeCapability = NewDisposeCapability();
  // 5. Return AsyncdisposableStack
  return AsyncdisposableStack;
}

export function bootstrapAsyncDisposableStack(realmRec: Realm) {
  const asyncDisposableStackConstructor = bootstrapConstructor(realmRec, AsyncDisposableStackConstructor, 'AsyncDisposableStack', 0, realmRec.Intrinsics['%AsyncDisposableStack.prototype%'], []);
  realmRec.Intrinsics['%AsyncDisposableStack%'] = asyncDisposableStackConstructor;
}
