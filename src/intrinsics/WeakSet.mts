import { surroundingAgent } from '../host-defined/engine.mts';
import {
  UndefinedValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import {
  IsCallable,
  OrdinaryCreateFromConstructor,
  Call,
  Get,
  GetIterator,
  type OrdinaryObject,
  Realm,
  type FunctionObject,
  IteratorStepValue,
} from '../abstract-ops/all.mts';
import { IfAbruptCloseIterator, Q } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface WeakSetObject extends OrdinaryObject {
  readonly WeakSetData: (Value | undefined)[];
}
export function isWeakSetObject(object: object): object is WeakSetObject {
  return 'WeakSetData' in object;
}
/** https://tc39.es/ecma262/#sec-weakset-iterable */
function* WeakSetConstructor(this: FunctionObject, [iterable = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let set be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakSet.prototype%", « [[WeakSetData]] »).
  const set = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%WeakSet.prototype%', ['WeakSetData'])) as Mutable<WeakSetObject>;
  // 3. Set set.[[WeakSetData]] to a new empty List.
  set.WeakSetData = [];
  // 4. If iterable is either undefined or null, return set.
  if (iterable === Value.undefined || iterable === Value.null) {
    return set;
  }
  // 5. Let adder be ? Get(set, "add").
  const adder = Q(yield* Get(set, Value('add')));
  // 6. If IsCallable(adder) is false, throw a TypeError exception.
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
  }
  // 7. Let iteratorRecord be ? GetIterator(iterable).
  const iteratorRecord = Q(yield* GetIterator(iterable, 'sync'));
  // 8. Repeat,
  while (true) {
    // a. Let next be ? IteratorStep(iteratorRecord).
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    // b. If next is false, return set.
    if (next === 'done') {
      return set;
    }
    // d. Let status be Call(adder, set, « next »).
    const status = yield* Call(adder, set, [next]);
    // e. IfAbruptCloseIterator(status, iteratorRecord).
    IfAbruptCloseIterator(status, iteratorRecord);
  }
}

export function bootstrapWeakSet(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, WeakSetConstructor, 'WeakSet', 0, realmRec.Intrinsics['%WeakSet.prototype%'], []);
  realmRec.Intrinsics['%WeakSet%'] = c;
}
