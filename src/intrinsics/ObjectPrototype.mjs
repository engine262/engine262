import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Get,
  HasOwnProperty,
  Invoke,
  IsArray,
  SameValue,
  ToObject,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './bootstrap.mjs';

// #sec-object.prototype.hasownproperty
function ObjectProto_hasOwnProperty([V = Value.undefined], { thisValue }) {
  // 1. Let P be ? ToPropertyKey(V).
  const P = Q(ToPropertyKey(V));
  // 2. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));
  // 3. Return ? HasOwnProperty(O, P).
  return HasOwnProperty(O, P);
}

// #sec-object.prototype.isprototypeof
function ObjectProto_isPrototypeOf([V = Value.undefined], { thisValue }) {
  // 1. If Type(V) is not Object, return false.
  if (Type(V) !== 'Object') {
    return Value.false;
  }
  // 2. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));
  // 3. Repeat,
  while (true) {
    // a. Set V to ? V.[[GetPrototypeOf]]().
    V = Q(V.GetPrototypeOf());
    // b. If V is null, return false.
    if (V === Value.null) {
      return Value.false;
    }
    // c. If SameValue(O, V) is true, return true.
    if (SameValue(O, V) === Value.true) {
      return Value.true;
    }
  }
}

// #sec-object.prototype.propertyisenumerable
function ObjectProto_propertyIsEnumerable([V = Value.undefined], { thisValue }) {
  // 1. Let P be ? ToPropertyKey(V).
  const P = Q(ToPropertyKey(V));
  // 2. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));
  // 3. Let desc be ? O.[[GetOwnProperty]](P).
  const desc = Q(O.GetOwnProperty(P));
  // 4. If desc is undefined, return false.
  if (Type(desc) === 'Undefined') {
    return Value.false;
  }
  // 5. Return desc.[[Enumerable]].
  return desc.Enumerable;
}

// #sec-object.prototype.tolocalestring
function ObjectProto_toLocaleString(argList, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Return ? Invoke(O, "toString").
  return Q(Invoke(O, new Value('toString')));
}

// #sec-object.prototype.tostring
function ObjectProto_toString(argList, { thisValue }) {
  // 1. If the this value is undefined, return "[object Undefined]".
  if (thisValue === Value.undefined) {
    return new Value('[object Undefined]');
  }
  // 2. If the this value is null, return "[object Null]".
  if (thisValue === Value.null) {
    return new Value('[object Null]');
  }
  // 3. Let O be ! ToObject(this value).
  const O = X(ToObject(thisValue));
  // 4. Let isArray be ? IsArray(O).
  const isArray = Q(IsArray(O));
  let builtinTag;
  // 5. If isArray is true, let builtinTag be "Array".
  if (isArray === Value.true) {
    builtinTag = 'Array';
  } else if ('ParameterMap' in O) { // 6. Else if O has a [[ParameterMap]] internal slot, let builtinTag be "Arguments".
    builtinTag = 'Arguments';
  } else if ('Call' in O) { // 7. Else if O has a [[Call]] internal method, let builtinTag be "Function".
    builtinTag = 'Function';
  } else if ('ErrorData' in O) { // 8. Else if O has an [[ErrorData]] internal slot, let builtinTag be "Error".
    builtinTag = 'Error';
  } else if ('BooleanData' in O) { // 9. Else if O has a [[BooleanData]] internal slot, let builtinTag be "Boolean".
    builtinTag = 'Boolean';
  } else if ('NumberData' in O) { // 10. Else if O has a [[NumberData]] internal slot, let builtinTag be "Number".
    builtinTag = 'Number';
  } else if ('StringData' in O) { // 11. Else if O has a [[StringData]] internal slot, let builtinTag be "String".
    builtinTag = 'String';
  } else if ('DateValue' in O) { // 12. Else if O has a [[DateValue]] internal slot, let builtinTag be "Date".
    builtinTag = 'Date';
  } else if ('RegExpMatcher' in O) { // 13. Else if O has a [[RegExpMatcher]] internal slot, let builtinTag be "RegExp".
    builtinTag = 'RegExp';
  } else { // 14. Else, let builtinTag be "Object".
    builtinTag = 'Object';
  }
  // 15. Let tag be ? Get(O, @@toStringTag).
  let tag = Q(Get(O, wellKnownSymbols.toStringTag));
  // 16. If Type(tag) is not String, set tag to builtinTag.
  if (Type(tag) !== 'String') {
    tag = builtinTag;
  }
  // 17. Return the string-concatenation of "[object ", tag, and "]".
  return new Value(`[object ${tag.stringValue ? tag.stringValue() : tag}]`);
}

// #sec-object.prototype.valueof
function ObjectProto_valueOf(argList, { thisValue }) {
  // 1. Return ? ToObject(this value).
  return Q(ToObject(thisValue));
}

export function BootstrapObjectPrototype(realmRec) {
  const proto = realmRec.Intrinsics['%Object.prototype%'];

  assignProps(realmRec, proto, [
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
