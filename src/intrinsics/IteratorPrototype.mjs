import {
  Value,
  wellKnownSymbols,
  Descriptor,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionName,
  SetFunctionLength,
} from '../abstract-ops/all.mjs';

function IteratorPrototype_iterator(args, { thisValue }) {
  return thisValue;
}

export function CreateIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

  const fn = CreateBuiltinFunction(IteratorPrototype_iterator, [], realmRec);
  SetFunctionName(fn, wellKnownSymbols.iterator);
  SetFunctionLength(fn, new Value(0));

  proto.DefineOwnProperty(wellKnownSymbols.iterator, Descriptor({
    Value: fn,
    Enumerable: new Value(false),
    Configurable: new Value(false),
    Writable: new Value(false),
  }));

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
