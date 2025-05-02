import {
  GetIteratorFlattenable,
  OrdinaryCreateFromConstructor,
  OrdinaryHasInstance,
  OrdinaryObjectCreate,
  type BuiltinFunctionObject,
  type IteratorObject,
  type Realm,
} from '../abstract-ops/all.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  type BooleanValue,
  UndefinedValue,
  Value,
  type Arguments,
  type FunctionCallContext,
  type ObjectValue,
} from '../value.mts';
import { bootstrapConstructor } from './bootstrap.mts';


/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator-constructor */
function* IteratorConstructor(
  this: BuiltinFunctionObject,
  _args: Arguments,
  { NewTarget }: FunctionCallContext,
): ValueEvaluator<ObjectValue> {
  // 1. If NewTarget is either undefined or the active function object, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  if (NewTarget === surroundingAgent.activeFunctionObject) {
    return surroundingAgent.Throw('TypeError', 'CannotConstructAbstractFunction', NewTarget);
  }

  // 2. Return ? OrdinaryCreateFromConstructor(NewTarget, "%Iterator.prototype%").
  return Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%Iterator.prototype%'));
}

/** https://tc39.es/ecma262/#sec-iterator.from */
function* Iterator_from([O]: Arguments): ValueEvaluator {
  // 1. Let iteratorRecord be ? GetIteratorFlattenable(O, iterate-string-primitives).
  const iteratorRecord = Q(yield* GetIteratorFlattenable(O, 'iterate-string-primitives'));

  // 2. Let hasInstance be ? OrdinaryHasInstance(%Iterator%, iteratorRecord.[[Iterator]]).
  const hasInstance: BooleanValue = Q(yield* OrdinaryHasInstance(surroundingAgent.intrinsic('%Iterator%'), iteratorRecord.Iterator));
  // 3. If hasInstance is true, then
  if (hasInstance === Value.true) {
    // a. Return iteratorRecord.[[Iterator]].
    return iteratorRecord.Iterator;
  }

  // 4. Let wrapper be OrdinaryObjectCreate(%WrapForValidIteratorPrototype%, « [[Iterated]] »).
  const wrapper = OrdinaryObjectCreate(
    surroundingAgent.intrinsic('%WrapForValidIteratorPrototype%'),
    ['Iterated'],
  ) as Mutable<IteratorObject>;
  // 5. Set wrapper.[[Iterated]] to iteratorRecord.
  wrapper.Iterated = iteratorRecord;
  // 6. Return wrapper.
  return wrapper;
}

export function bootstrapIterator(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, IteratorConstructor, 'Iterator', 0, realmRec.Intrinsics['%Iterator.prototype%'], [
    ['from', Iterator_from, 1],
  ]);

  realmRec.Intrinsics['%Iterator%'] = cons;
}
