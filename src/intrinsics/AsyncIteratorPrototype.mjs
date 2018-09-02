import {
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';

export function CreateAsyncIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%IteratorPrototype%']);

  const fn = CreateBuiltinFunction((args, { thisValue }) => thisValue, [], realmRec);
  SetFunctionName(fn, NewValue('[Symbol.asyncIterator]'));

  proto.DefineOwnProperty(wellKnownSymbols.asyncIterator, {
    Value: fn,
    Enumerable: false,
    Configurable: false,
    Writable: false,
  });

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
