import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import {
  Get,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-error.prototype.tostring
function ErrorProto_toString(args, { thisValue }) {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let name be ? Get(O, "name").
  let name = Q(Get(O, new Value('name')));
  // 4. If name is undefined, set name to "Error"; otherwise set name to ? ToString(name).
  if (name === Value.undefined) {
    name = new Value('Error');
  } else {
    name = Q(ToString(name));
  }
  // 5. Let msg be ? Get(O, "message").
  let msg = Q(Get(O, new Value('message')));
  // 6. If msg is undefined, set msg to the empty String; otherwise set msg to ? ToString(msg).
  if (msg === Value.undefined) {
    msg = new Value('');
  } else {
    msg = Q(ToString(msg));
  }
  // 7. If name is the empty String, return msg.
  if (name.stringValue() === '') {
    return msg;
  }
  // 8. If msg is the empty String, return name.
  if (msg.stringValue() === '') {
    return name;
  }
  // 9. Return the string-concatenation of name, the code unit 0x003A (COLON), the code unit 0x0020 (SPACE), and msg.
  return new Value(`${name.stringValue()}: ${msg.stringValue()}`);
}

export function BootstrapErrorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toString', ErrorProto_toString, 0],
    ['message', new Value('')],
    ['name', new Value('Error')],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Error.prototype%'] = proto;
}
