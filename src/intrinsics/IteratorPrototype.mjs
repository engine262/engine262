import {
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';

export function CreateIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

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
