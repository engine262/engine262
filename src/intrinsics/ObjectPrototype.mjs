import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  DefinePropertyOrThrow,
  Get,
  HasOwnProperty,
  Invoke,
  IsAccessorDescriptor,
  IsArray,
  IsCallable,
  RequireObjectCoercible,
  SameValue,
  ToObject,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './Bootstrap.mjs';

function ObjectProto_hasOwnProperty([V = Value.undefined], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  return HasOwnProperty(O, P);
}

function ObjectProto_isPrototypeOf([V = Value.undefined], { thisValue }) {
  if (Type(V) !== 'Object') {
    return Value.false;
  }
  const O = Q(ToObject(thisValue));
  while (true) {
    V = Q(V.GetPrototypeOf());
    if (Type(V) === 'Null') {
      return Value.false;
    }
    if (SameValue(O, V) === Value.true) {
      return Value.true;
    }
  }
}

function ObjectProto_propertyIsEnumerable([V = Value.undefined], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return Value.false;
  }
  return desc.Enumerable;
}

function ObjectProto_toLocaleString(argList, { thisValue }) {
  const O = thisValue;
  return Q(Invoke(O, new Value('toString')));
}

function ObjectProto_toString(argList, { thisValue }) {
  if (Type(thisValue) === 'Undefined') {
    return new Value('[object Undefined]');
  }
  if (Type(thisValue) === 'Null') {
    return new Value('[object Null]');
  }
  const O = X(ToObject(thisValue));
  const isArray = Q(IsArray(O));
  let builtinTag;
  if (isArray === Value.true) {
    builtinTag = 'Array';
  } else if ('ParameterMap' in O) {
    builtinTag = 'Arguments';
  } else if ('Call' in O) {
    builtinTag = 'Function';
  } else if ('ErrorData' in O) {
    builtinTag = 'Error';
  } else if ('BooleanData' in O) {
    builtinTag = 'Boolean';
  } else if ('NumberData' in O) {
    builtinTag = 'Number';
  } else if ('StringData' in O) {
    builtinTag = 'String';
  } else if ('DateValue' in O) {
    builtinTag = 'Date';
  } else if ('RegExpMatcher' in O) {
    builtinTag = 'RegExp';
  } else {
    builtinTag = 'Object';
  }
  let tag = Q(Get(O, wellKnownSymbols.toStringTag));
  if (Type(tag) !== 'String') {
    tag = builtinTag;
  }
  return new Value(`[object ${tag.stringValue ? tag.stringValue() : tag}]`);
}

function ObjectProto_valueOf(argList, { thisValue }) {
  return Q(ToObject(thisValue));
}

// #sec-get-object.prototype.__proto__
function ObjectProto_protoGetter(args, { thisValue }) {
  // 1. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));

  // 2. Return ? O.[[GetPrototypeOf]]().
  return O.GetPrototypeOf();
}

// #sec-set-object.prototype.__proto__
function ObjectProto_protoSetter([proto = Value.undefined], { thisValue }) {
  // 1. Let O be ? RequireObjectCoercible(this value).
  const O = Q(RequireObjectCoercible(thisValue));

  // 2. If Type(proto) is neither Object nor Null, return undefined.
  if (Type(proto) !== 'Object' && Type(proto) !== 'Null') {
    return Value.undefined;
  }

  // 3. If Type(O) is not Object, return undefined.
  if (Type(O) !== 'Object') {
    return Value.undefined;
  }

  // 4. Let status be ? O.[[SetPrototypeOf]](proto).
  const status = O.SetPrototypeOf(proto);

  // 5. If status is false, throw a TypeError exception.
  if (status === Value.false) {
    return surroundingAgent.Throw('TypeError', 'ObjectSetPrototype');
  }

  // 6. Return undefined.
  return Value.undefined;
}

// #sec-object.prototype.__defineGetter__
function ObjectProto_defineGetter([P, getter], { thisValue }) {
  // 1. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));

  // 2. If IsCallable(getter) is false, throw a TypeError exception.
  if (IsCallable(getter) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', getter);
  }

  // 3. Let desc be PropertyDescriptor { [[Get]]: getter, [[Enumerable]]: true, [[Configurable]]: true }.
  const desc = Descriptor({ Get: getter, Enumerable: true, Configurable: true });

  // 4. Let key be ? ToPropertyKey(P).
  const key = Q(ToPropertyKey(P));

  // 5. Perform ? DefinePropertyOrThrow(O, key, desc).
  Q(DefinePropertyOrThrow(O, key, desc));

  // 6. Return undefined.
  return Value.undefined;
}

// #sec-object.prototype.__defineSetter__
function ObjectProto_defineSetter([P, setter], { thisValue }) {
  // 1. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));

  // 2. If IsCallable(setter) is false, throw a TypeError exception.
  if (IsCallable(setter) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', setter);
  }

  // 3. Let desc be PropertyDescriptor { [[Set]]: setter, [[Enumerable]]: true, [[Configurable]]: true }.
  const desc = Descriptor({ Set: setter, Enumerable: true, Configurable: true });

  // 4. Let key be ? ToPropertyKey(P).
  const key = Q(ToPropertyKey(P));

  // 5. Perform ? DefinePropertyOrThrow(O, key, desc).
  Q(DefinePropertyOrThrow(O, key, desc));

  // 6. Return undefined.
  return Value.undefined;
}

// #sec-object.prototype.__lookupGetter__
function ObjectProto_lookupGetter([P], { thisValue }) {
  // 1. Let O be ? ToObject(this value).
  let O = Q(ToObject(thisValue));

  // 2. Let key be ? ToPropertyKey(P).
  const key = Q(ToPropertyKey(P));

  // 3. Repeat,
  while (true) {
    // a. Let desc be ? O.[[GetOwnProperty]](key).
    const desc = O.GetOwnProperty(key);

    // b. If desc is not undefined, then
    if (desc !== Value.undefined) {
      // i. If IsAccessorDescriptor(desc) is true, return desc.[[Get]].
      if (IsAccessorDescriptor(desc)) {
        return desc.Get;
      }

      // ii. Return undefined.
      return Value.undefined;
    }

    // c. Set O to ? O.[[GetPrototypeOf]]().
    O = O.GetPrototypeOf();

    // d. If O is null, return undefined.
    if (O === Value.null) {
      return Value.undefined;
    }
  }
}

// #sec-object.prototype.__lookupSetter__
function ObjectProto_lookupSetter([P], { thisValue }) {
  // 1. Let O be ? ToObject(this value).
  let O = Q(ToObject(thisValue));

  // 2. Let key be ? ToPropertyKey(P).
  const key = Q(ToPropertyKey(P));

  // 3. Repeat,
  while (true) {
    // a. Let desc be ? O.[[GetOwnProperty]](key).
    const desc = O.GetOwnProperty(key);

    // b. If desc is not undefined, then
    if (desc !== Value.undefined) {
      // i. If IsAccessorDescriptor(desc) is true, return desc.[[Set]].
      if (IsAccessorDescriptor(desc)) {
        return desc.Set;
      }

      // ii. Return undefined.
      return Value.undefined;
    }

    // c. Set O to ? O.[[GetPrototypeOf]]().
    O = O.GetPrototypeOf();

    // d. If O is null, return undefined.
    if (O === Value.null) {
      return Value.undefined;
    }
  }
}

export function BootstrapObjectPrototype(realmRec) {
  const proto = realmRec.Intrinsics['%Object.prototype%'];

  assignProps(realmRec, proto, [
    ...(surroundingAgent.feature('Object.prototype.__AnnexB__')
      ? [
        ['__defineGetter__', ObjectProto_defineGetter, 2],
        ['__defineSetter__', ObjectProto_defineSetter, 2],
        ['__lookupGetter__', ObjectProto_lookupGetter, 1],
        ['__lookupSetter__', ObjectProto_lookupSetter, 1],
        ['__proto__', [ObjectProto_protoGetter, ObjectProto_protoSetter]],
      ]
      : []),
    ['hasOwnProperty', ObjectProto_hasOwnProperty, 1],
    ['isPrototypeOf', ObjectProto_isPrototypeOf, 1],
    ['propertyIsEnumerable', ObjectProto_propertyIsEnumerable, 1],
    ['toLocaleString', ObjectProto_toLocaleString, 0],
    ['toString', ObjectProto_toString, 0],
    ['valueOf', ObjectProto_valueOf, 0],
  ]);

  realmRec.Intrinsics['%Object.prototype.toString%'] = X(Get(proto, new Value('toString')));
  realmRec.Intrinsics['%Object.prototype.valueOf%'] = X(Get(proto, new Value('valueOf')));
}
