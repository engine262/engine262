import {
  UndefinedValue,
  NullValue,
  StringValue,
  wellKnownSymbols,
  ObjectValue,
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  Get,
  HasOwnProperty,
  Invoke,
  IsArray,
  SameValue,
  ToObject,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

function ObjectHasOwnProperty(realm, [V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  return HasOwnProperty(O, P);
}

function ObjectIsPrototypeOf(realm, [V], { thisValue }) {
  if (Type(V) !== 'Object') {
    return NewValue(false);
  }
  const O = Q(ToObject(thisValue));
  while (true) {
    V = Q(V.GetPrototypeOf());
    if (V instanceof NullValue) {
      return NewValue(false);
    }
    if (SameValue(O, V) === true) {
      return NewValue(true);
    }
  }
}

function ObjectPropertyIsEnumerable(realm, [V], { thisValue }) {
  const P = Q(ToPropertyKey(V));
  const O = Q(ToObject(thisValue));
  const desc = Q(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    return NewValue(false);
  }
  return desc.Enumerable;
}

function ObjectToLocaleString(realm, argList, { thisValue }) {
  const O = thisValue;
  return Q(Invoke(O, 'toString'));
}

function ObjectToString(realm, argList, { thisValue }) {
  if (thisValue instanceof UndefinedValue) {
    return NewValue('[object Undefined]');
  }
  if (thisValue instanceof UndefinedValue) {
    return NewValue('[object Null]');
  }
  const O = X(ToObject(thisValue));
  const isArray = Q(IsArray(O));
  let builtinTag;
  if (isArray === true) {
    builtinTag = 'Array';
  } else if (O instanceof StringValue) {
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

function ObjectValueOf(realm, argList, { thisValue }) {
  return Q(ToObject(thisValue));
}

export function CreateObjectPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  [
    ['hasOwnProperty', ObjectHasOwnProperty],
    ['isPrototypeOf', ObjectIsPrototypeOf],
    ['propertyIsEnumerable', ObjectPropertyIsEnumerable],
    ['toLocaleString', ObjectToLocaleString],
    ['toString', ObjectToString],
    ['valueOf', ObjectValueOf],
  ].forEach(([name, fn]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%ObjProto_toString%'] = Get(proto, NewValue('toString'));
  realmRec.Intrinsics['%ObjProto_valueOf%'] = Get(proto, NewValue('valueOf'));

  realmRec.Intrinsics['%ObjectPrototype%'] = proto;
}
