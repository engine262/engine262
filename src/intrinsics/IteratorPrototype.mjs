import {
  New as NewValue,
  ObjectValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  SetFunctionName,
} from '../abstract-ops/all.mjs';

export function CreateIteratorPrototype(realmRec) {
  const proto = new ObjectValue(undefined, realmRec);

  const fn = CreateBuiltinFunction((realm, args, { thisValue }) => thisValue, [], realmRec);
  SetFunctionName(fn, NewValue('[Symbol.iterator]'));

  proto.DefineOwnProperty(wellKnownSymbols.iterator, {
    Value: fn,
    Enumerable: false,
    Configurable: false,
    Writable: false,
  });

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
