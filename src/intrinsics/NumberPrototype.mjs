import {
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  ToInteger,
  ToString,
} from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';

function thisNumberValue(value) {
  if (Type(value) === 'Number') {
    return value;
  }
  if (Type(value) === 'Object' && 'NumberData' in value) {
    return value.NumberData;
  }
  return surroundingAgent.Throw('TypeError');
}

function NumberToString(args, { thisValue }) {
  const [radix] = args;
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (args.length === 0 || Type(radix) === 'Undefined') {
    radixNumber = 10;
  } else {
    radixNumber = Q(ToInteger(radix)).numberValue();
  }
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('TypeError');
  }
  if (radixNumber === 10) {
    return X(ToString(x));
  }
  // FIXME(devsnek): Return the String representation of this Number
  // value using the radix specified by radixNumber. Letters a-z are
  // used for digits with values 10 through 35. The precise algorithm
  // is implementation-dependent, however the algorithm should be a
  // generalization of that specified in 7.1.12.1.
  return NewValue(42);
}

export function CreateNumberPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);
  proto.NumberData = NewValue(0);

  [
    ['toString', NumberToString],
  ].forEach(([name, fn]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%NumberPrototype%'] = proto;
}
