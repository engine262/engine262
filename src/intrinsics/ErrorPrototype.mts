import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  JSStringValue,
  ObjectValue,
  Value,
  type Arguments,
  type FunctionCallContext,
  type UndefinedValue,
} from '../value.mts';
import {
  Assert,
  Get,
  Realm,
  SetterThatIgnoresPrototypeProperties,
  ToString,
  type BuiltinFunctionObject,
} from '../abstract-ops/all.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { isErrorObject } from './Error.mts';

/** https://tc39.es/ecma262/#sec-error.prototype.tostring */
function* ErrorProto_toString(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<JSStringValue> {
  // 1. Let O be this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let name be ? Get(O, "name").
  let name = Q(yield* Get(O, Value('name')));
  // 4. If name is undefined, set name to "Error"; otherwise set name to ? ToString(name).
  if (name === Value.undefined) {
    name = Value('Error');
  } else {
    name = Q(yield* ToString(name));
  }
  // 5. Let msg be ? Get(O, "message").
  let msg = Q(yield* Get(O, Value('message')));
  // 6. If msg is undefined, set msg to the empty String; otherwise set msg to ? ToString(msg).
  if (msg === Value.undefined) {
    msg = Value('');
  } else {
    msg = Q(yield* ToString(msg));
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
  return Value(`${name.stringValue()}: ${msg.stringValue()}`);
}

/** https://tc39.es/proposal-error-stack-accessor/#sec-get-error.prototype.stack */
function* ErrorProto_getStack(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<JSStringValue | UndefinedValue> {
  // 1. Let E be the this value.
  const E = thisValue;
  // 2. If E is not an Object, throw a TypeError exception.
  if (!(E instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', E);
  }
  // 3. If E does not have an [[ErrorData]] internal slot, return undefined.
  if (!isErrorObject(E)) {
    return Value.undefined;
  }
  // 4. Return an implementation-defined string that represents the stack trace of E.
  Assert(E.ErrorData instanceof JSStringValue);
  return E.ErrorData;
}

/** https://tc39.es/proposal-error-stack-accessor/#sec-set-error.prototype.stack */
function* ErrorProto_setStack(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<UndefinedValue> {
  const [v = Value.undefined] = args;

  // 1. Let E be the this value.
  const E = thisValue;
  // 2. If E is not an Object, throw a TypeError exception.
  if (!(E instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', E);
  }
  // 3. Let numberOfArgs be the number of arguments passed to this function call.
  const numberOfArgs = args.length;
  // 4. If numberOfArgs is 0, throw a TypeError exception.
  if (numberOfArgs === 0) {
    return surroundingAgent.Throw('TypeError', 'NotEnoughArguments', numberOfArgs, 1);
  }
  // 5. If E does not have an [[ErrorData]] internal slot, return undefined.
  if (!isErrorObject(E)) {
    return Value.undefined;
  }
  // 6. Perform ? SetterThatIgnoresPrototypeProperties(this value, %Error.prototype%, "stack", v).
  Q(yield* SetterThatIgnoresPrototypeProperties(thisValue, surroundingAgent.intrinsic('%Error.prototype%'), Value('stack'), v));
  // 7. Return undefined.
  return Value.undefined;
}

export function bootstrapErrorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['toString', ErrorProto_toString, 0],
    ['message', Value('')],
    ['name', Value('Error')],
    ['stack', [ErrorProto_getStack, ErrorProto_setStack]],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Error.prototype%'] = proto;
  realmRec.Intrinsics['%Error.prototype.toString%'] = X(Get(proto, Value('toString'))) as BuiltinFunctionObject;
}
