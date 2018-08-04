import {
  StringValue,
  ObjectValue,
  New as NewValue,
  Type,
} from '../value.mjs';

import {
  surroundingAgent,
} from '../engine.mjs';

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

function ObjectHasOwnProperty(realm, [V], { thisArgument }) {
  const P = ToPropertyKey(V);
  const O = ToObject(thisArgument);
  return HasOwnProperty(O, P);
}

function ObjectIsPrototypeOf(realm, [V], { thisArgument }) {
  if (Type(V) !== 'Object') {
    return false;
  }
  const O = ToObject(thisArgument);
  while (true) {
    V = V.GetPrototypeOf();
    if (V.isNull()) {
      return false;
    }
    if (SameValue(O, V) === true) {
      return true;
    }
  }
}

function ObjectPropertyIsEnumerable(realm, [V], { thisArgument }) {
  const P = ToPropertyKey(V);
  const O = ToObject(thisArgument);
  const desc = O.GetOwnProperty(P);
  if (desc.isUndefined()) {
    return false;
  }
  return desc.Enumerable;
}

function ObjectToLocaleString(realm, argList, { thisArgument }) {
  const O = thisArgument;
  return Invoke(O, 'toString');
}

function ObjectToString(realm, argList, { thisArgument }) {
  if (thisArgument.isUndefined()) {
    return NewValue('[object Undefined]');
  }
  if (thisArgument.isNull()) {
    return NewValue('[object Null]');
  }
  const O = ToObject(thisArgument);
  const isArray = IsArray(O);
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
  let tag = Get(O, surroundingAgent.currentRealmRecord.Intrinsics['@@toStringTag']);
  if (Type(tag) !== 'String') {
    tag = builtinTag;
  }
  return NewValue(`[object ${tag}]`);
}

function ObjectValueOf(realm, argList, { thisArgument }) {
  return ToObject(thisArgument);
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
