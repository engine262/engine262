import {
  Type,
  UndefinedValue,
  ObjectValue,
  New as NewValue,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ToString,
  ToInteger,
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

function NumberToString(realm, args, { thisValue }) {
  const [radix] = args;
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (args.length === 0 || radix instanceof UndefinedValue) {
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
  const proto = new ObjectValue(realmRec);

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
