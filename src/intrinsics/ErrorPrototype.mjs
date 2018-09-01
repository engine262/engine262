import {
  surroundingAgent,
} from '../engine.mjs';
import {
  New as NewValue,
  ObjectValue,
  Type,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  Get,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

function ErrorProto_toString(realm, args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  let name = Q(Get(O, NewValue('name')));
  if (Type(name) === 'Undefined') {
    name = NewValue('Error');
  } else {
    name = Q(ToString(name));
  }
  let msg = Q(Get(O, NewValue('message')));
  if (Type(msg) === 'Undefined') {
    msg = NewValue('');
  } else {
    msg = Q(ToString(msg));
  }
  if (name.stringValue() === '') {
    return msg;
  }
  if (msg.stringValue() === '') {
    return name;
  }
  return NewValue(`${name.stringValue()}: ${msg.stringValue()}`);
}

export function CreateErrorPrototype(realmRec) {
  const proto = new ObjectValue(undefined, realmRec);

  proto.DefineOwnProperty(NewValue('toString'), {
    Value: CreateBuiltinFunction(ErrorProto_toString, [], realmRec),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  [
    ['message', NewValue('')],
    ['name', NewValue('Error')],
  ].forEach(([name, value]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: value,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%ErrorPrototype%'] = proto;
}
