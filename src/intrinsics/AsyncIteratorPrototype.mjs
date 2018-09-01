import {
  New as NewValue,
  ObjectValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  SetFunctionName,
} from '../abstract-ops/all.mjs';

export function CreateAsyncIteratorPrototype(realmRec) {
  const proto = new ObjectValue(undefined, realmRec);
  proto.Prototype = realmRec.Intrinsics['%IteratorPrototype%'];

  const fn = CreateBuiltinFunction((realm, args, { thisValue }) => thisValue, [], realmRec);
  SetFunctionName(fn, NewValue('[Symbol.asyncIterator]'));

  proto.DefineOwnProperty(wellKnownSymbols.asyncIterator, {
    Value: fn,
    Enumerable: false,
    Configurable: false,
    Writable: false,
  });

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
