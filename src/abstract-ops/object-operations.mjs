import {
  Descriptor,
  Type,
  Value,
  ObjectValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import { InstanceofOperator } from '../runtime-semantics/all.mjs';
import {
  NormalCompletion,
  EnsureCompletion,
  Q, X,
} from '../completion.mjs';
import {
  ArrayCreate,
  Assert,
  IsAccessorDescriptor,
  IsCallable,
  IsConstructor,
  IsDataDescriptor,
  IsExtensible,
  IsPropertyKey,
  SameValue,
  ToLength,
  ToObject,
  ToString,
  isProxyExoticObject,
  F as toNumberValue,
} from './all.mjs';


// This file covers abstract operations defined in
// 7.3 #sec-operations-on-objects

// #sec-makebasicobject
export function MakeBasicObject(internalSlotsList) {
  // 1.  Assert: internalSlotsList is a List of internal slot names.
  Assert(Array.isArray(internalSlotsList));
  // 2.  Let obj be a newly created object with an internal slot for each name in internalSlotsList.
  // 3.  Set obj's essential internal methods to the default ordinary object definitions specified in 9.1.
  const obj = new ObjectValue(internalSlotsList);
  internalSlotsList.forEach((s) => {
    obj[s] = Value.undefined;
  });
  // 4.  Assert: If the caller will not be overriding both obj's [[GetPrototypeOf]] and [[SetPrototypeOf]] essential internal methods, then internalSlotsList contains [[Prototype]].
  // 5.  Assert: If the caller will not be overriding all of obj's [[SetPrototypeOf]], [[IsExtensible]], and [[PreventExtensions]] essential internal methods, then internalSlotsList contains [[Extensible]].
  // 6.  If internalSlotsList contains [[Extensible]], then set obj.[[Extensible]] to true.
  if (internalSlotsList.includes('Extensible')) {
    obj.Extensible = Value.true;
  }
  // 7.  Return obj.
  return obj;
}

// 7.3.1 #sec-get-o-p
export function Get(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  // TODO: This should just return Q(O.Get(P, O))
  return NormalCompletion(Q(O.Get(P, O)));
}

// 7.3.2 #sec-getv
export function GetV(V, P) {
  Assert(IsPropertyKey(P));
  const O = Q(ToObject(V));
  return Q(O.Get(P, V));
}

// 7.3.3 #sec-set-o-p-v-throw
export function Set(O, P, V, Throw) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  Assert(Type(Throw) === 'Boolean');
  const success = Q(O.Set(P, V, O));
  if (success === Value.false && Throw === Value.true) {
    return surroundingAgent.Throw('TypeError', 'CannotSetProperty', P, O);
  }
  return success;
}

// 7.3.4 #sec-createdataproperty
export function CreateDataProperty(O, P, V) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.true,
    Configurable: Value.true,
  });
  return Q(O.DefineOwnProperty(P, newDesc));
}

// 7.3.5 #sec-createmethodproperty
export function CreateMethodProperty(O, P, V) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));

  const newDesc = Descriptor({
    Value: V,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  });
  return Q(O.DefineOwnProperty(P, newDesc));
}

// 7.3.6 #sec-createdatapropertyorthrow
export function CreateDataPropertyOrThrow(O, P, V) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(CreateDataProperty(O, P, V));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

// 7.3.7 #sec-definepropertyorthrow
export function DefinePropertyOrThrow(O, P, desc) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(O.DefineOwnProperty(P, desc));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDefineProperty', P);
  }
  return success;
}

// 7.3.8 #sec-deletepropertyorthrow
export function DeletePropertyOrThrow(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = Q(O.Delete(P));
  if (success === Value.false) {
    return surroundingAgent.Throw('TypeError', 'CannotDeleteProperty', P);
  }
  return success;
}

// 7.3.9 #sec-getmethod
export function GetMethod(V, P) {
  Assert(IsPropertyKey(P));
  const func = Q(GetV(V, P));
  if (func === Value.null || func === Value.undefined) {
    return Value.undefined;
  }
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  return func;
}

// 7.3.10 #sec-hasproperty
export function HasProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return Q(O.HasProperty(P));
}

// 7.3.11 #sec-hasownproperty
export function HasOwnProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const desc = Q(O.GetOwnProperty(P));
  if (desc === Value.undefined) {
    return Value.false;
  }
  return Value.true;
}

// 7.3.12 #sec-call
export function Call(F, V, argumentsList) {
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(argumentsList.every((a) => a instanceof Value));

  if (IsCallable(F) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', F);
  }

  return EnsureCompletion(Q(F.Call(V, argumentsList)));
}

// 7.3.13 #sec-construct
export function Construct(F, argumentsList, newTarget) {
  if (!newTarget) {
    newTarget = F;
  }
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(IsConstructor(F) === Value.true);
  Assert(IsConstructor(newTarget) === Value.true);
  return Q(F.Construct(argumentsList, newTarget));
}

// 7.3.14 #sec-setintegritylevel
export function SetIntegrityLevel(O, level) {
  Assert(Type(O) === 'Object');
  Assert(level === 'sealed' || level === 'frozen');
  const status = Q(O.PreventExtensions());
  if (status === Value.false) {
    return Value.false;
  }
  const keys = Q(O.OwnPropertyKeys());
  if (level === 'sealed') {
    for (const k of keys) {
      Q(DefinePropertyOrThrow(O, k, Descriptor({ Configurable: Value.false })));
    }
  } else if (level === 'frozen') {
    for (const k of keys) {
      const currentDesc = Q(O.GetOwnProperty(k));
      if (currentDesc !== Value.undefined) {
        let desc;
        if (IsAccessorDescriptor(currentDesc) === true) {
          desc = Descriptor({ Configurable: Value.false });
        } else {
          desc = Descriptor({ Configurable: Value.false, Writable: Value.false });
        }
        Q(DefinePropertyOrThrow(O, k, desc));
      }
    }
  }
  return Value.true;
}

// 7.3.15 #sec-testintegritylevel
export function TestIntegrityLevel(O, level) {
  Assert(Type(O) === 'Object');
  Assert(level === 'sealed' || level === 'frozen');
  const extensible = Q(IsExtensible(O));
  if (extensible === Value.true) {
    return Value.false;
  }
  const keys = Q(O.OwnPropertyKeys());
  for (const k of keys) {
    const currentDesc = Q(O.GetOwnProperty(k));
    if (currentDesc !== Value.undefined) {
      if (currentDesc.Configurable === Value.true) {
        return Value.false;
      }
      if (level === 'frozen' && IsDataDescriptor(currentDesc)) {
        if (currentDesc.Writable === Value.true) {
          return Value.false;
        }
      }
    }
  }
  return Value.true;
}

// 7.3.16 #sec-createarrayfromlist
export function CreateArrayFromList(elements) {
  // 1. Assert: elements is a List whose elements are all ECMAScript language values.
  Assert(elements.every((e) => e instanceof Value));
  // 2. Let array be ! ArrayCreate(0).
  const array = X(ArrayCreate(0));
  // 3. Let n be 0.
  let n = 0;
  // 4. For each element e of elements, do
  for (const e of elements) {
    // a. Perform ! CreateDataPropertyOrThrow(array, ! ToString(𝔽(n)), e).
    X(CreateDataPropertyOrThrow(array, X(ToString(toNumberValue(n))), e));
    // b. Set n to n + 1.
    n += 1;
  }
  // 5. Return array.
  return array;
}

// 7.3.17 #sec-lengthofarraylike
export function LengthOfArrayLike(obj) {
  // 1. Assert: Type(obj) is Object.
  Assert(Type(obj) === 'Object');
  // 2. Return ℝ(? ToLength(? Get(obj, "length"))).
  return Q(ToLength(Q(Get(obj, new Value('length'))))).numberValue();
}

// 7.3.17 #sec-createlistfromarraylike
export function CreateListFromArrayLike(obj, elementTypes) {
  // 1. If elementTypes is not present, set elementTypes to « Undefined, Null, Boolean, String, Symbol, Number, BigInt, Object ».
  if (!elementTypes) {
    elementTypes = ['Undefined', 'Null', 'Boolean', 'String', 'Symbol', 'Number', 'BigInt', 'Object'];
  }
  // 2. If Type(obj) is not Object, throw a TypeError exception.
  if (Type(obj) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', obj);
  }
  // 3. Let len be ? LengthOfArrayLike(obj).
  const len = Q(LengthOfArrayLike(obj));
  // 4. Let list be a new empty List.
  const list = [];
  // 5. Let index be 0.
  let index = 0;
  // 6. Repeat, while index < len,
  while (index < len) {
    // a. Let indexName be ! ToString(𝔽(index)).
    const indexName = X(ToString(toNumberValue(index)));
    // b. Let next be ? Get(obj, indexName).
    const next = Q(Get(obj, indexName));
    // c. If Type(next) is not an element of elementTypes, throw a TypeError exception.
    if (!elementTypes.includes(Type(next))) {
      return surroundingAgent.Throw('TypeError', 'NotPropertyName', next);
    }
    // d. Append next as the last element of list.
    list.push(next);
    // e. Set index to index + 1.
    index += 1;
  }
  // 7. Return list.
  return list;
}

// 7.3.18 #sec-invoke
export function Invoke(V, P, argumentsList) {
  Assert(IsPropertyKey(P));
  if (!argumentsList) {
    argumentsList = [];
  }
  const func = Q(GetV(V, P));
  return Q(Call(func, V, argumentsList));
}

// 7.3.19 #sec-ordinaryhasinstance
export function OrdinaryHasInstance(C, O) {
  if (IsCallable(C) === Value.false) {
    return Value.false;
  }
  if ('BoundTargetFunction' in C) {
    const BC = C.BoundTargetFunction;
    return Q(InstanceofOperator(O, BC));
  }
  if (Type(O) !== 'Object') {
    return Value.false;
  }
  const P = Q(Get(C, new Value('prototype')));
  if (Type(P) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', P);
  }
  while (true) {
    O = Q(O.GetPrototypeOf());
    if (O === Value.null) {
      return Value.false;
    }
    if (SameValue(P, O) === Value.true) {
      return Value.true;
    }
  }
}

// 7.3.20 #sec-speciesconstructor
export function SpeciesConstructor(O, defaultConstructor) {
  Assert(Type(O) === 'Object');
  const C = Q(Get(O, new Value('constructor')));
  if (C === Value.undefined) {
    return defaultConstructor;
  }
  if (Type(C) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', C);
  }
  const S = Q(Get(C, wellKnownSymbols.species));
  if (S === Value.undefined || S === Value.null) {
    return defaultConstructor;
  }
  if (IsConstructor(S) === Value.true) {
    return S;
  }
  return surroundingAgent.Throw('TypeError', 'SpeciesNotConstructor');
}

// 7.3.21 #sec-enumerableownpropertynames
export function EnumerableOwnPropertyNames(O, kind) {
  Assert(Type(O) === 'Object');
  const ownKeys = Q(O.OwnPropertyKeys());
  const properties = [];
  for (const key of ownKeys) {
    if (Type(key) === 'String') {
      const desc = Q(O.GetOwnProperty(key));
      if (desc !== Value.undefined && desc.Enumerable === Value.true) {
        if (kind === 'key') {
          properties.push(key);
        } else {
          const value = Q(Get(O, key));
          if (kind === 'value') {
            properties.push(value);
          } else {
            Assert(kind === 'key+value');
            const entry = X(CreateArrayFromList([key, value]));
            properties.push(entry);
          }
        }
      }
    }
  }
  return properties;
}

// 7.3.22 #sec-getfunctionrealm
export function GetFunctionRealm(obj) {
  Assert(X(IsCallable(obj)) === Value.true);
  if ('Realm' in obj) {
    return obj.Realm;
  }

  if ('BoundTargetFunction' in obj) {
    const target = obj.BoundTargetFunction;
    return Q(GetFunctionRealm(target));
  }

  if (isProxyExoticObject(obj)) {
    if (obj.ProxyHandler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'GetFunctionRealm');
    }
    const proxyTarget = obj.ProxyTarget;
    return Q(GetFunctionRealm(proxyTarget));
  }

  return surroundingAgent.currentRealmRecord;
}

// 7.3.23 #sec-copydataproperties
export function CopyDataProperties(target, source, excludedItems) {
  Assert(Type(target) === 'Object');
  Assert(excludedItems.every((i) => IsPropertyKey(i)));
  if (source === Value.undefined || source === Value.null) {
    return target;
  }
  const from = X(ToObject(source));
  const keys = Q(from.OwnPropertyKeys());
  for (const nextKey of keys) {
    let excluded = false;
    for (const e of excludedItems) {
      if (SameValue(e, nextKey) === Value.true) {
        excluded = true;
      }
    }
    if (excluded === false) {
      const desc = Q(from.GetOwnProperty(nextKey));
      if (desc !== Value.undefined && desc.Enumerable === Value.true) {
        const propValue = Q(Get(from, nextKey));
        X(CreateDataProperty(target, nextKey, propValue));
      }
    }
  }
  return target;
}
