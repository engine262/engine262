// @ts-nocheck
import {
  Assert,
  Call,
  DeletePropertyOrThrow,
  Get,
  HasProperty,
  Invoke,
  IsCallable,
  SameValueZero,
  Set,
  StrictEqualityComparison,
  ToBoolean,
  ToIntegerOrInfinity,
  ToObject,
  ToString,
  𝔽, ℝ,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { NullValue, UndefinedValue, Value } from '../value.mjs';
import { assignProps } from './bootstrap.mjs';

// Algorithms and methods shared between %Array.prototype% and
// %TypedArray.prototype%.

/** https://tc39.es/ecma262/#sec-array.prototype.sort */
/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort */
//
// If internalMethodsRestricted is true, then Asserts are used to ensure that
// "The only internal methods of the this object that the algorithm may call
// are [[Get]] and [[Set]]," a requirement of %TypedArray%.prototype.sort.
export function ArrayProto_sortBody(obj, len, SortCompare, internalMethodsRestricted = false) {
  const items = [];
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(𝔽(k)));
    if (internalMethodsRestricted) {
      items.push(Q(Get(obj, Pk)));
    } else {
      const kPresent = Q(HasProperty(obj, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(obj, Pk));
        items.push(kValue);
      }
    }
    k += 1;
  }
  const itemCount = items.length;

  // Mergesort.
  const lBuffer = [];
  const rBuffer = [];
  for (let step = 1; step < items.length; step *= 2) {
    for (let start = 0; start < items.length - 1; start += 2 * step) {
      const sizeLeft = step;
      const mid = start + sizeLeft;
      const sizeRight = Math.min(step, items.length - mid);
      if (sizeRight < 0) {
        continue;
      }

      // Merge.
      for (let l = 0; l < sizeLeft; l += 1) {
        lBuffer[l] = items[start + l];
      }
      for (let r = 0; r < sizeRight; r += 1) {
        rBuffer[r] = items[mid + r];
      }

      {
        let l = 0;
        let r = 0;
        let o = start;
        while (l < sizeLeft && r < sizeRight) {
          const cmp = ℝ(Q(SortCompare(lBuffer[l], rBuffer[r])));
          if (cmp <= 0) {
            items[o] = lBuffer[l];
            o += 1;
            l += 1;
          } else {
            items[o] = rBuffer[r];
            o += 1;
            r += 1;
          }
        }
        while (l < sizeLeft) {
          items[o] = lBuffer[l];
          o += 1;
          l += 1;
        }
        while (r < sizeRight) {
          items[o] = rBuffer[r];
          o += 1;
          r += 1;
        }
      }
    }
  }

  let j = 0;
  while (j < itemCount) {
    Q(Set(obj, X(ToString(𝔽(j))), items[j], Value.true));
    j += 1;
  }
  while (j < len) {
    Q(DeletePropertyOrThrow(obj, X(ToString(𝔽(j)))));
    j += 1;
  }

  return obj;
}

export function bootstrapArrayPrototypeShared(realmRec, proto, priorToEvaluatingAlgorithm, objectToLength) {
  /** https://tc39.es/ecma262/#sec-array.prototype.every */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.every */
  function ArrayProto_every([callbackFn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(callbackFn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackFn);
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        const testResult = ToBoolean(Q(Call(callbackFn, thisArg, [kValue, 𝔽(k), O])));
        if (testResult === Value.false) {
          return Value.false;
        }
      }
      k += 1;
    }
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.find */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.find */
  function ArrayProto_find([predicate = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(predicate, thisArg, [kValue, 𝔽(k), O])));
      if (testResult === Value.true) {
        return kValue;
      }
      k += 1;
    }
    return Value.undefined;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.findindex */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findindex */
  function ArrayProto_findIndex([predicate = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(predicate, thisArg, [kValue, 𝔽(k), O])));
      if (testResult === Value.true) {
        return 𝔽(k);
      }
      k += 1;
    }
    return 𝔽(-1);
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.findlast */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlast */
  function ArrayProto_findLast([predicate = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    // Let O be ? ToObject(this value).
    const O = Q(ToObject(thisValue));
    // 2. Let len be ? LengthOfArrayLike(O).
    const len = Q(objectToLength(O));
    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    }
    // 4. Let k be len - 1.
    let k = len - 1;
    // 5. Repeat, while k ≥ 0,
    while (k >= 0) {
      // a. Let Pk be ! ToString(𝔽(k)).
      const Pk = X(ToString(𝔽(k)));
      // b. Let kValue be ? Get(O, Pk).
      const kValue = Q(Get(O, Pk));
      // c. Let testResult be ToBoolean(? Call(predicate, thisArg, « kValue, 𝔽(k), O »)).
      const testResult = ToBoolean(Q(Call(predicate, thisArg, [kValue, 𝔽(k), O])));
      // d. If testResult is true, return kValue.
      if (testResult === Value.true) {
        return kValue;
      }
      // e. Set k to k - 1.
      k -= 1;
    }
    // 6. Return undefined.
    return Value.undefined;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.findlastindex */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.findlastindex */
  function ArrayProto_findLastIndex([predicate = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    // Let O be ? ToObject(this value).
    const O = Q(ToObject(thisValue));
    // 2. Let len be ? LengthOfArrayLike(O).
    const len = Q(objectToLength(O));
    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    if (IsCallable(predicate) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    }
    // 4. Let k be len - 1.
    let k = len - 1;
    // 5. Repeat, while k ≥ 0,
    while (k >= 0) {
      // a. Let Pk be ! ToString(𝔽(k)).
      const Pk = X(ToString(𝔽(k)));
      // b. Let kValue be ? Get(O, Pk).
      const kValue = Q(Get(O, Pk));
      // c. Let testResult be ToBoolean(? Call(predicate, thisArg, « kValue, 𝔽(k), O »)).
      const testResult = ToBoolean(Q(Call(predicate, thisArg, [kValue, 𝔽(k), O])));
      // d. If testResult is true, return 𝔽(k).
      if (testResult === Value.true) {
        return 𝔽(k);
      }
      // e. Set k to k - 1.
      k -= 1;
    }
    // 6. Return Return -1𝔽.
    return 𝔽(-1);
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.foreach */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.foreach */
  function ArrayProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        Q(Call(callbackfn, thisArg, [kValue, 𝔽(k), O]));
      }
      k += 1;
    }
    return Value.undefined;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.includes */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.includes */
  function ArrayProto_includes([searchElement = Value.undefined, fromIndex = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (len === 0) {
      return Value.false;
    }
    const n = Q(ToIntegerOrInfinity(fromIndex));
    if (fromIndex === Value.undefined) {
      Assert(n === 0);
    }
    let k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    while (k < len) {
      const kStr = X(ToString(𝔽(k)));
      const elementK = Q(Get(O, kStr));
      if (SameValueZero(searchElement, elementK) === Value.true) {
        return Value.true;
      }
      k += 1;
    }
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.indexof */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.indexof */
  function ArrayProto_indexOf([searchElement = Value.undefined, fromIndex = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (len === 0) {
      return 𝔽(-1);
    }
    const n = Q(ToIntegerOrInfinity(fromIndex));
    if (fromIndex === Value.undefined) {
      Assert(n === 0);
    }
    if (n >= len) {
      return 𝔽(-1);
    }
    let k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    while (k < len) {
      const kStr = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, kStr));
      if (kPresent === Value.true) {
        const elementK = Q(Get(O, kStr));
        const same = StrictEqualityComparison(searchElement, elementK);
        if (same === Value.true) {
          return 𝔽(k);
        }
      }
      k += 1;
    }
    return 𝔽(-1);
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.join */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.join */
  function ArrayProto_join([separator = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    let sep;
    if (separator instanceof UndefinedValue) {
      sep = ',';
    } else {
      sep = Q(ToString(separator)).stringValue();
    }
    let R = '';
    let k = 0;
    while (k < len) {
      if (k > 0) {
        R = `${R}${sep}`;
      }
      const kStr = X(ToString(𝔽(k)));
      const element = Q(Get(O, kStr));
      let next;
      if (element instanceof UndefinedValue || element instanceof NullValue) {
        next = '';
      } else {
        next = Q(ToString(element)).stringValue();
      }
      R = `${R}${next}`;
      k += 1;
    }
    return Value(R);
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.lastindexof */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.lastindexof */
  function ArrayProto_lastIndexOf([searchElement = Value.undefined, fromIndex], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (len === 0) {
      return 𝔽(-1);
    }
    let n;
    if (fromIndex !== undefined) {
      n = Q(ToIntegerOrInfinity(fromIndex));
    } else {
      n = len - 1;
    }
    let k;
    if (n >= 0) {
      k = Math.min(n, len - 1);
    } else {
      k = len + n;
    }
    while (k >= 0) {
      const kStr = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, kStr));
      if (kPresent === Value.true) {
        const elementK = Q(Get(O, kStr));
        const same = StrictEqualityComparison(searchElement, elementK);
        if (same === Value.true) {
          return 𝔽(k);
        }
      }
      k -= 1;
    }
    return 𝔽(-1);
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.reduce */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduce */
  function ArrayProto_reduce([callbackfn = Value.undefined, initialValue], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
    }
    if (len === 0 && initialValue === undefined) {
      return surroundingAgent.Throw('TypeError', 'ArrayEmptyReduce');
    }
    let k = 0;
    let accumulator = Value.undefined;
    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      let kPresent = false;
      while (kPresent === false && k < len) {
        const Pk = X(ToString(𝔽(k)));
        kPresent = Q(HasProperty(O, Pk)) === Value.true;
        if (kPresent === true) {
          accumulator = Q(Get(O, Pk));
        }
        k += 1;
      }
      if (kPresent === false) {
        return surroundingAgent.Throw('TypeError', 'ArrayEmptyReduce');
      }
    }
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, 𝔽(k), O]));
      }
      k += 1;
    }
    return accumulator;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.reduceright */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reduceright */
  function ArrayProto_reduceRight([callbackfn = Value.undefined, initialValue], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
    }
    if (len === 0 && initialValue === undefined) {
      return surroundingAgent.Throw('TypeError', 'ArrayEmptyReduce');
    }
    let k = len - 1;
    let accumulator = Value.undefined;
    if (initialValue !== undefined) {
      accumulator = initialValue;
    } else {
      let kPresent = false;
      while (kPresent === false && k >= 0) {
        const Pk = X(ToString(𝔽(k)));
        kPresent = Q(HasProperty(O, Pk)) === Value.true;
        if (kPresent === true) {
          accumulator = Q(Get(O, Pk));
        }
        k -= 1;
      }
      if (kPresent === false) {
        return surroundingAgent.Throw('TypeError', 'ArrayEmptyReduce');
      }
    }
    while (k >= 0) {
      const Pk = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, 𝔽(k), O]));
      }
      k -= 1;
    }
    return accumulator;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.reverse */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.reverse */
  function ArrayProto_reverse(args, { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    const middle = Math.floor(len / 2);
    let lower = 0;
    while (lower !== middle) {
      const upper = len - lower - 1;
      const upperP = X(ToString(𝔽(upper)));
      const lowerP = X(ToString(𝔽(lower)));
      const lowerExists = Q(HasProperty(O, lowerP));
      let lowerValue;
      let upperValue;
      if (lowerExists === Value.true) {
        lowerValue = Q(Get(O, lowerP));
      }
      const upperExists = Q(HasProperty(O, upperP));
      if (upperExists === Value.true) {
        upperValue = Q(Get(O, upperP));
      }
      if (lowerExists === Value.true && upperExists === Value.true) {
        Q(Set(O, lowerP, upperValue, Value.true));
        Q(Set(O, upperP, lowerValue, Value.true));
      } else if (lowerExists === Value.false && upperExists === Value.true) {
        Q(Set(O, lowerP, upperValue, Value.true));
        Q(DeletePropertyOrThrow(O, upperP));
      } else if (lowerExists === Value.true && upperExists === Value.false) {
        Q(DeletePropertyOrThrow(O, lowerP));
        Q(Set(O, upperP, lowerValue, Value.true));
      } else {
        // no further action is required
      }
      lower += 1;
    }
    return O;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.some */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.some */
  function ArrayProto_some([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const len = Q(objectToLength(O));
    if (IsCallable(callbackfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
    }
    let k = 0;
    while (k < len) {
      const Pk = X(ToString(𝔽(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        const testResult = ToBoolean(Q(Call(callbackfn, thisArg, [kValue, 𝔽(k), O])));
        if (testResult === Value.true) {
          return Value.true;
        }
      }
      k += 1;
    }
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-array.prototype.tolocalestring */
  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype.tolocalestring */
  function ArrayProto_toLocaleString(args, { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const array = Q(ToObject(thisValue));
    const len = Q(objectToLength(array));
    const separator = ', ';
    let R = '';
    let k = 0;
    while (k < len) {
      if (k > 0) {
        R = `${R}${separator}`;
      }
      const kStr = X(ToString(𝔽(k)));
      const nextElement = Q(Get(array, kStr));
      if (nextElement !== Value.undefined && nextElement !== Value.null) {
        const S = Q(ToString(Q(Invoke(nextElement, Value('toLocaleString'))))).stringValue();
        R = `${R}${S}`;
      }
      k += 1;
    }
    return Value(R);
  }

  assignProps(realmRec, proto, [
    ['every', ArrayProto_every, 1],
    ['find', ArrayProto_find, 1],
    ['findIndex', ArrayProto_findIndex, 1],
    ['findLast', ArrayProto_findLast, 1],
    ['findLastIndex', ArrayProto_findLastIndex, 1],
    ['forEach', ArrayProto_forEach, 1],
    ['includes', ArrayProto_includes, 1],
    ['indexOf', ArrayProto_indexOf, 1],
    ['join', ArrayProto_join, 1],
    ['lastIndexOf', ArrayProto_lastIndexOf, 1],
    ['reduce', ArrayProto_reduce, 1],
    ['reduceRight', ArrayProto_reduceRight, 1],
    ['reverse', ArrayProto_reverse, 0],
    ['some', ArrayProto_some, 1],
    ['toLocaleString', ArrayProto_toLocaleString, 0],
  ]);
}
