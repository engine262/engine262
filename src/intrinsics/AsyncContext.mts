// @ts-nocheck
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-object */
export function bootstrapAsyncContext(realmRec) {
  const asyncContextObj = bootstrapPrototype(realmRec, [
    ['Snapshot', realmRec.Intrinsics['%AsyncContext.Snapshot%']],
    ['Variable', realmRec.Intrinsics['%AsyncContext.Variable%']],
  ], realmRec.Intrinsics['%Object.prototype%'], 'AsyncContext');

  realmRec.Intrinsics['%AsyncContext%'] = asyncContextObj;
}
