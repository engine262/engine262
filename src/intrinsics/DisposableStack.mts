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

export type DisposableStackObjectValue = OrdinaryObjectValue<{
    DisposableState: 'pending' | 'disposed';
    DisposeCapability: DisposeCapabilityRecord;
}>;

/** https://tc39.es/ecma262/#sec-disposablestack */
function DisposableStackConstructor(this: unknown, _: ArgumentList, { NewTarget }: NativeFunctionContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let disposableStack be ? OrdinaryCreateFromConstructor(NewTarget, "%DisposableStack.prototype%", « [[DisposableState]], [[DisposeCapability]] »).
  const disposableStack = Q(OrdinaryCreateFromConstructor(NewTarget as ObjectValue, '%DisposableStack.prototype%', ['DisposableState', 'DisposeCapability'])) as DisposableStackObjectValue;
  // 3. Set disposableStack.[[DisposableState]] to pending.
  disposableStack.DisposableState = 'pending';
  // 4. Set disposableStack.[[DisposeCapability]] to NewDisposeCapability().
  disposableStack.DisposeCapability = NewDisposeCapability();
  // 5. Return disposableStack
  return disposableStack;
}

export function bootstrapDisposableStack(realmRec: Realm) {
  const disposableStackConstructor = bootstrapConstructor(realmRec, DisposableStackConstructor, 'DisposableStack', 0, realmRec.Intrinsics['%DisposableStack.prototype%'], []);
  realmRec.Intrinsics['%DisposableStack%'] = disposableStackConstructor;
}
