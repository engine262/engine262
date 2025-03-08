import { surroundingAgent } from '../engine.mts';
import {
  Call,
  Get,
  GetIterator,
  IsCallable,
  IteratorStep,
  IteratorValue,
  OrdinaryCreateFromConstructor,
  Realm,
  type FunctionObject,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import {
  ObjectValue, UndefinedValue, Value, wellKnownSymbols, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { IfAbruptCloseIterator, Q } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface SetObject extends OrdinaryObject {
  readonly SetData: (Value | undefined)[];
}
/** https://tc39.es/ecma262/#sec-set-iterable */
function SetConstructor(this: FunctionObject, [iterable = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let set be ? OrdinaryCreateFromConstructor(NewTarget, "%Set.prototype%", « [[SetData]] »).
  const set = Q(OrdinaryCreateFromConstructor(NewTarget, '%Set.prototype%', ['SetData'])) as Mutable<SetObject>;
  // 3. Set set.[[SetData]] to a new empty List.
  set.SetData = [];
  // 4. If iterable is either undefined or null, return set.
  if (iterable === Value.undefined || iterable === Value.null) {
    return set;
  }
  // 5. Let adder be ? Get(set, "add").
  const adder = Q(Get(set, Value('add')));
  // 6. If IsCallable(adder) is false, throw a TypeError exception.
  if (IsCallable(adder) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', adder);
  }
  // 7. Let iteratorRecord be ? GetIterator(iterable).
  const iteratorRecord = Q(GetIterator(iterable, 'sync'));
  // 8. Repeat,
  while (true) {
    // a. Let next be ? IteratorStep(iteratorRecord).
    const next = Q(IteratorStep(iteratorRecord));
    // b. If next is false, return set.
    if (next === Value.false) {
      return set;
    }
    // c. Let nextValue be ? IteratorValue(next).
    const nextValue = Q(IteratorValue(next as ObjectValue));
    // d. Let status be Call(adder, set, « nextValue »).
    const status = Call(adder, set, [nextValue]);
    // e. IfAbruptCloseIterator(status, iteratorRecord).
    IfAbruptCloseIterator(status, iteratorRecord);
  }
}

/** https://tc39.es/ecma262/#sec-get-set-@@species */
function Set_speciesGetter(_args: Arguments, { thisValue }: FunctionCallContext) {
  // Return the this value.
  return thisValue;
}

export function bootstrapSet(realmRec: Realm) {
  const setConstructor = bootstrapConstructor(realmRec, SetConstructor, 'Set', 0, realmRec.Intrinsics['%Set.prototype%'], [
    [wellKnownSymbols.species, [Set_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Set%'] = setConstructor;
}
