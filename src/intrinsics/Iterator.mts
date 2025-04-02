import { bootstrapConstructor } from './bootstrap.mts';
import {
  GetIteratorFlattenable,
  OrdinaryCreateFromConstructor,
  OrdinaryHasInstance,
  OrdinaryObjectCreate,
  Q,
  Realm,
  surroundingAgent,
  UndefinedValue,
  type Arguments,
  type FunctionCallContext,
  type IteratorRecord,
  type Mutable,
  type OrdinaryObject,
  type ValueEvaluator,
} from '#self';

interface IteratorObject extends OrdinaryObject {
  Iterated: IteratorRecord;
}

/** https://tc39.es/ecma262/#sec-iterator-constructor */
function* IteratorConstructor(_args: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // If NewTarget is either undefined or the active function object, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'NotDefined', NewTarget);
  }
  if (NewTarget === surroundingAgent.activeFunctionObject) {
    return surroundingAgent.Throw('TypeError', 'InvalidNewTarget', NewTarget);
  }

  // 2. Return ? OrdinaryCreateFromConstructor(NewTarget, "%Iterator.prototype%").
  return Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%IteratorPrototype%'));
}

/** https://tc39.es/ecma262/#sec-iterator.from */
function* Iterator_from([O]: Arguments): ValueEvaluator {
  // 1. Let iteratorRecord be ? GetIteratorFlattenable(O, iterate-string-primitives).
  const iteratorRecord = Q(yield* GetIteratorFlattenable(O, 'iterate-string-primitives'));

  // 2. Let hasInstance be ? OrdinaryHasInstance(%Iterator%, iteratorRecord.[[Iterator]]).
  const hasInstance = Q(yield* OrdinaryHasInstance(surroundingAgent.intrinsic('%Iterator%'), iteratorRecord.Iterator));
  // 3. If hasInstance is true, then
  if (hasInstance.booleanValue()) {
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
  const proto = realmRec.Intrinsics['%IteratorPrototype%'];

  // TODO: https://tc39.es/ecma262/#sec-get-iterator.prototype.constructor
  // TODO: https://tc39.es/ecma262/#sec-set-iterator.prototype.constructor
  const cons = bootstrapConstructor(realmRec, IteratorConstructor, 'Iterator', 0, proto, [
    ['from', Iterator_from, 1],
  ]);

  realmRec.Intrinsics['%Iterator%'] = cons;
}
