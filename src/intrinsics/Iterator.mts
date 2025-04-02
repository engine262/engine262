import {
  OrdinaryCreateFromConstructor,
  type BuiltinFunctionObject,
  type Realm,
} from '../abstract-ops/all.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  UndefinedValue,
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

export function bootstrapIterator(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, IteratorConstructor, 'Iterator', 0, realmRec.Intrinsics['%Iterator.prototype%'], [
  ]);

  realmRec.Intrinsics['%Iterator%'] = cons;
}
