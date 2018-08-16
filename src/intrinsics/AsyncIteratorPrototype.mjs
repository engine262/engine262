import {
  wellKnownSymbols,
  ObjectValue,
  New as NewValue,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';

export function CreateAsyncIteratorPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);
  proto.Prototype = realmRec.Intrinsics['%IteratorPrototype%'];

  const fn = CreateBuiltinFunction((realm, args, { thisValue }) => thisValue, [], realmRec);
  fn.properties.set(NewValue('name'), {
    Value: NewValue('[Symbol.asyncIterator]'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(wellKnownSymbols.asyncIterator, {
    Value: fn,
    Enumerable: false,
    Configurable: false,
    Writable: false,
  });

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
