import {
  Call,
  Get,
  HasProperty,
  IsCallable,
  ToBoolean,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { assignProps } from './Bootstrap.mjs';

// Algorithms shared between %ArrayPrototype% and %TypedArrayPrototype%.

export function CreateArrayPrototypeShared(realmRec, proto, priorToEvaluatingAlgorithm, objectToLength) {
  // 22.1.3.5 #sec-array.prototype.every
  // 22.2.3.7 #sec-%typedarray%.prototype.every
  function ArrayProto_every([callbackFn, thisArg], { thisValue }) {
    Q(priorToEvaluatingAlgorithm(thisValue));
    const O = Q(ToObject(thisValue));
    const lenProp = Q(objectToLength(O));
    const len = Q(ToLength(lenProp));
    if (IsCallable(callbackFn) === Value.false) {
      return surroundingAgent.Throw('TypeError');
    }
    let T;
    if (thisArg !== undefined) {
      T = thisArg;
    } else {
      T = Value.undefined;
    }
    let k = 0;
    while (k < len.numberValue()) {
      const Pk = X(ToString(new Value(k)));
      const kPresent = Q(HasProperty(O, Pk));
      if (kPresent === Value.true) {
        const kValue = Q(Get(O, Pk));
        const testResult = ToBoolean(Q(Call(callbackFn, T, [kValue, new Value(k), O])));
        if (testResult === Value.false) {
          return Value.false;
        }
      }
      k += 1;
    }
    return Value.true;
  }

  assignProps(realmRec, proto, [
    ['every', ArrayProto_every, 1],
  ]);
}
