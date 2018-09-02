import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  Get,
  HasOwnProperty,
  Invoke,
  IsArray,
  ObjectCreate,
  SameValue,
  SetFunctionLength,
  SetFunctionName,
  ToObject,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

function ObjectProto_hasOwnProperty(realm, [V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  return HasOwnProperty(O, P);
}

function ObjectProto_isPrototypeOf(realm, [V], { thisValue }) {
  if (Type(V) !== 'Object') {
    return NewValue(false);
  }
  const O = Q(ToObject(thisValue));
  while (true) {
    V = Q(V.GetPrototypeOf());
    if (Type(V) === 'Null') {
      return NewValue(false);
    }
    if (SameValue(O, V) === true) {
      return NewValue(true);
    }
  }
}

function ObjectProto_propertyIsEnumerable(realm, [V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return NewValue(false);
  }
  return desc.Enumerable;
}

function ObjectProto_toLocaleString(realm, argList, { thisValue }) {
  const O = thisValue;
  return Q(Invoke(O, 'toString'));
}

function ObjectProto_toString(realm, argList, { thisValue }) {
  if (Type(thisValue) === 'Undefined') {
    return NewValue('[object Undefined]');
  }
  if (Type(thisValue) === 'Undefined') {
    return NewValue('[object Null]');
  }
  const O = X(ToObject(thisValue));
  const isArray = Q(IsArray(O));
  let builtinTag;
  if (isArray.isTrue()) {
    builtinTag = 'Array';
  } else if (Type(O) === 'String') {
    builtinTag = 'String';
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
  return NewValue(`[object ${tag}]`);
}

function ObjectProto_valueOf(realm, argList, { thisValue }) {
  return Q(ToObject(thisValue));
}

export function CreateObjectPrototype(realmRec) {
  // FIXME(devsnek): this should be an immutable prototype object
  const proto = ObjectCreate(NewValue(null));

  [
    ['hasOwnProperty', ObjectProto_hasOwnProperty, 1],
    ['isPrototypeOf', ObjectProto_isPrototypeOf, 1],
    ['propertyIsEnumerable', ObjectProto_propertyIsEnumerable, 1],
    ['toLocaleString', ObjectProto_toLocaleString, 0],
    ['toString', ObjectProto_toString, 0],
    ['valueOf', ObjectProto_valueOf, 0],
  ].forEach(([name, fn, length]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(length));
    proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%ObjProto_toString%'] = Get(proto, NewValue('toString'));
  realmRec.Intrinsics['%ObjProto_valueOf%'] = Get(proto, NewValue('valueOf'));

  realmRec.Intrinsics['%ObjectPrototype%'] = proto;
}
