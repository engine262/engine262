import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Value, wellKnownSymbols } from '../value.mjs';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
  IsConstructor,
  IterableToList,
  Set,
  LengthOfArrayLike,
  ToObject,
  ToString,
  TypedArrayCreate,
} from '../abstract-ops/all.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

// #sec-%typedarray%-intrinsic-object
function TypedArrayConstructor() {
  // 1. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotAConstructor', this);
}

// #sec-%typedarray%.from
function TypedArray_from([source = Value.undefined, mapfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. If IsConstructor(C) is false, throw a TypeError exception.
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 3. If mapfn is undefined, let mapping be false.
  let mapping;
  if (mapfn === Value.undefined) {
    mapping = false;
  } else {
    // a. If IsCallable(mapfn) is false, throw a TypeError exception.
    if (IsCallable(mapfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapfn);
    }
    // b. Let mapping be true.
    mapping = true;
  }
  // 5. Let usingIterator be ? GetMethod(source, @@iterator).
  const usingIterator = Q(GetMethod(source, wellKnownSymbols.iterator));
  // 6. If usingIterator is not undefined, then
  if (usingIterator !== Value.undefined) {
    const values = Q(IterableToList(source, usingIterator));
    const len = values.length;
    const targetObj = Q(TypedArrayCreate(C, [new Value(len)]));
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(new Value(k)));
      const kValue = values.shift();
      let mappedValue;
      if (mapping) {
        mappedValue = Q(Call(mapfn, thisArg, [kValue, new Value(k)]));
      } else {
        mappedValue = kValue;
      }
      Q(Set(targetObj, Pk, mappedValue, Value.true));
      k += 1;
    }
    Assert(values.length === 0);
    return targetObj;
  }
  // 7. NOTE: source is not an Iterable so assume it is already an array-like object.
  // 8. Let arrayLike be ! ToObject(source).
  const arrayLike = X(ToObject(source));
  // 9. Let len be ? LengthOfArrayLike(arrayLike).
  const len = Q(LengthOfArrayLike(arrayLike)).numberValue();
  // 10. Let targetObj be ? TypedArrayCreate(C, « len »).
  const targetObj = Q(TypedArrayCreate(C, [new Value(len)]));
  // 11. Let k be 0.
  let k = 0;
  // 12. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ! ToString(k).
    const Pk = X(ToString(new Value(k)));
    // b. Let kValue be ? Get(arrayLike, Pk).
    const kValue = Q(Get(arrayLike, Pk));
    let mappedValue;
    // c. If mapping is true, then
    if (mapping) {
      // i. Let mappedValue be ? Call(mapfn, thisArg, « kValue, k »).
      mappedValue = Q(Call(mapfn, thisArg, [kValue, new Value(k)]));
    } else {
      // d. Else, let mappedValue be kValue.
      mappedValue = kValue;
    }
    // e. Perform ? Set(targetObj, Pk, mappedValue, true).
    Q(Set(targetObj, Pk, mappedValue, Value.true));
    // f. Set k to k + 1.
    k += 1;
  }
  // 13. Return targetObj.
  return targetObj;
}

// #sec-%typedarray%.of
function TypedArray_of(items, { thisValue }) {
  // 1. Let len be the actual number of arguments passed to this function.
  // 2. Let items be the List of arguments passed to this function.
  const len = items.length;
  // 3. Let C be the this value.
  const C = thisValue;
  // 4. If IsConstructor(C) is false, throw a TypeError exception.
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  // 5. Let newObj be ? TypedArrayCreate(C, « len »).
  const newObj = Q(TypedArrayCreate(C, [new Value(len)]));
  // 6. Let k be 0.
  let k = 0;
  // 7. Repeat, while k < len
  while (k < len) {
    // a. Let kValue be items[k].
    const kValue = items[k];
    // b. Let Pk be ! ToString(k).
    const Pk = X(ToString(new Value(k)));
    // c. Perform ? Set(newObj, Pk, kValue, true).
    Q(Set(newObj, Pk, kValue, Value.true));
    // d. Set k to k + 1.
    k += 1;
  }
  // 8. Return newObj.
  return newObj;
}

// #sec-get-%typedarray%-@@species
function TypedArray_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function BootstrapTypedArray(realmRec) {
  const typedArrayConstructor = bootstrapConstructor(realmRec, TypedArrayConstructor, 'TypedArray', 0, realmRec.Intrinsics['%TypedArray.prototype%'], [
    ['from', TypedArray_from, 1],
    ['of', TypedArray_of, 0],
    [wellKnownSymbols.species, [TypedArray_speciesGetter]],
  ]);

  realmRec.Intrinsics['%TypedArray%'] = typedArrayConstructor;
}
