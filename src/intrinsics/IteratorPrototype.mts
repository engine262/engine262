import { SetterThatIgnoresPrototypeProperties, type Realm } from '../abstract-ops/all.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  UndefinedValue,
  Value, wellKnownSymbols, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-get-iterator.prototype.constructor */
function IteratorProto_constructorGetter() {
  // 1. Return %Iterator%.
  return surroundingAgent.intrinsic('%Iterator%');
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-set-iterator.prototype.constructor */
function* IteratorProto_constructorSetter([v]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<UndefinedValue> {
  // 1. Perform ? SetterThatIgnoresPrototypeProperties(this value, %Iterator.prototype%, "constructor", v).
  Q(yield* SetterThatIgnoresPrototypeProperties(
    thisValue,
    surroundingAgent.intrinsic('%Iterator.prototype%'),
    Value('constructor'),
    v,
  ));
  // 2. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator.prototype-%symbol.iterator% */
function IteratorPrototype_iterator(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return the this value.
  return thisValue;
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-get-iterator.prototype-%symbol.tostringtag% */
function IteratorPrototype_toStringTagGetter() {
  return Value('Iterator');
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-set-iterator.prototype-%symbol.tostringtag% */
function* IteratorPrototype_toStringTagSetter([v]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<UndefinedValue> {
  // 1. Perform ? SetterThatIgnoresPrototypeProperties(this value, %Iterator.prototype%, %Symbol.toStringTag%, v).
  Q(yield* SetterThatIgnoresPrototypeProperties(
    thisValue,
    surroundingAgent.intrinsic('%Iterator.prototype%'),
    wellKnownSymbols.toStringTag,
    v,
  ));
  // 2. Return undefined.
  return Value.undefined;
}

export function bootstrapIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['constructor', [IteratorProto_constructorGetter, IteratorProto_constructorSetter]],
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
    [wellKnownSymbols.toStringTag, [IteratorPrototype_toStringTagGetter, IteratorPrototype_toStringTagSetter]],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Iterator.prototype%'] = proto;
}
