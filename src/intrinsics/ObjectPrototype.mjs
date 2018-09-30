import {
  Value,
  Type,
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
import { BootstrapPrototype } from './Bootstrap.mjs';

function ObjectProto_hasOwnProperty([V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  return HasOwnProperty(O, P);
}

function ObjectProto_isPrototypeOf([V], { thisValue }) {
  if (Type(V) !== 'Object') {
    return new Value(false);
  }
  const O = Q(ToObject(thisValue));
  while (true) {
    V = Q(V.GetPrototypeOf());
    if (Type(V) === 'Null') {
      return new Value(false);
    }
    if (SameValue(O, V) === true) {
      return new Value(true);
    }
  }
}

function ObjectProto_propertyIsEnumerable([V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  const desc = Q(O.GetOwnProperty(P));
  if (Type(desc) === 'Undefined') {
    return new Value(false);
  }
  return desc.Enumerable;
}

function ObjectProto_toLocaleString(argList, { thisValue }) {
  const O = thisValue;
  return Q(Invoke(O, 'toString'));
}

function ObjectProto_toString(argList, { thisValue }) {
  if (Type(thisValue) === 'Undefined') {
    return new Value('[object Undefined]');
  }
  if (Type(thisValue) === 'Undefined') {
    return new Value('[object Null]');
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
  return new Value(`[object ${tag}]`);
}

function ObjectProto_valueOf(argList, { thisValue }) {
  return Q(ToObject(thisValue));
}

export function CreateObjectPrototype(realmRec) {
  // FIXME(devsnek): this should be an immutable prototype object
  const proto = BootstrapPrototype(realmRec, [
    ['hasOwnProperty', ObjectProto_hasOwnProperty, 1],
    ['isPrototypeOf', ObjectProto_isPrototypeOf, 1],
    ['propertyIsEnumerable', ObjectProto_propertyIsEnumerable, 1],
    ['toLocaleString', ObjectProto_toLocaleString, 0],
    ['toString', ObjectProto_toString, 0],
    ['valueOf', ObjectProto_valueOf, 0],
  ], new Value(null));

  realmRec.Intrinsics['%ObjProto_toString%'] = Get(proto, new Value('toString'));
  realmRec.Intrinsics['%ObjProto_valueOf%'] = Get(proto, new Value('valueOf'));

  realmRec.Intrinsics['%ObjectPrototype%'] = proto;
}
