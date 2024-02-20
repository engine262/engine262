// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  AsyncContextSnapshot, AsyncContextSwap, Call, CreateBuiltinFunction, Get,
  IsCallable, LengthOfArrayLike, OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import { Completion, Q } from '../completion.mjs';
import { JSStringValue, Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-snapshot */
function SnapshotConstructor(args, { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let snapshotMapping be AsyncContextSnapshot().
  const snapshotMapping = AsyncContextSnapshot();
  // 3. Let asyncSnapshot be ? OrdinaryCreateFromConstructor(NewTarget, "%AsyncContext.Snapshot.prototype%", « [[AsyncSnapshotMapping]] »).
  const asyncSnapshot = Q(OrdinaryCreateFromConstructor(NewTarget, '%AsyncContext.Snapshot.prototype%', ['AsyncSnapshotMapping']));
  // 4. Set asyncSnapshot.[[AsyncSnapshotMapping]] to snapshotMapping.
  asyncSnapshot.AsyncContextMapping = snapshotMapping;
  // 5. Return asyncSnapshot.
  return asyncSnapshot;
}

/** https://tc39.es/proposal-async-context/#sec-asynccontext-wrap */
function Snapshot_wrap([fn = Value.undefined]) {
  // 1. If IsCallable(fn) is false, throw a TypeError exception.
  if (IsCallable(fn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', fn);
  }
  // 2. Let snapshot be AsyncContextSnapshot().
  const snapshot = AsyncContextSnapshot();
  // 3. Let closure be a new Abstract Closure with parameters (...args) that captures fn and snapshot and performs the following steps when called:
  const closure = (args, { thisValue }) => {
    // a. Let thisArgument be the this value.
    const thisArgument = thisValue;
    // b. Let previousContextMapping be AsyncContextSwap(snapshot).
    const previousContextMapping = AsyncContextSwap(snapshot);
    // c. Let result be Completion(Call(fn, thisArgument, args)).
    const result = Completion(Call(fn, thisArgument, args));
    // d. AsyncContextSwap(previousContextMapping).
    AsyncContextSwap(previousContextMapping);
    // e. Return result.
    return result;
  };
  // 4. Let length be ? LengthOfArrayLike(fn).
  const length = Q(LengthOfArrayLike(fn));
  // 5. Let name be ? Get(fn, "name").
  let name = Q(Get(fn, Value('name')));
  // 6. If name is not a String, set name to the empty String.
  if (!(name instanceof JSStringValue)) {
    name = Value('');
  }
  // 7. Let realm be the current Realm Record.
  const realm = surroundingAgent.currentRealmRecord;
  // 8. Let prototype be realm.[[Intrinsics]].[[%Function.prototype%]].
  const prototype = realm.Intrinsics['%Function.prototype%'];
  // 9. Return CreateBuiltinFunction(closure, length, name, « », realm, prototype, "wrapped").
  return CreateBuiltinFunction(closure, length, name, [], realm, prototype, Value('wrapped'));
}

export function bootstrapAsyncContextSnapshot(realmRec) {
  const proto = realmRec.Intrinsics['%AsyncContext.Snapshot.prototype%'];
  const snapshotConstructor = bootstrapConstructor(realmRec, SnapshotConstructor, 'Snapshot', 0, proto, [
    ['wrap', Snapshot_wrap, 1],
  ]);

  realmRec.Intrinsics['%AsyncContext.Snapshot%'] = snapshotConstructor;
}
