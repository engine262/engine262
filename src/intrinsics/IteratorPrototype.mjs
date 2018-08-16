import {
  wellKnownSymbols,
  ObjectValue,
  New as NewValue,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';

export function CreateIteratorPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  const fn = CreateBuiltinFunction((realm, args, { thisValue }) => thisValue, [], realmRec);
  fn.properties.set(NewValue('name'), {
    Value: NewValue('[Symbol.iterator]'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(wellKnownSymbols.iterator, {
    Value: fn,
    Enumerable: false,
    Configurable: false,
    Writable: false,
  });

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
