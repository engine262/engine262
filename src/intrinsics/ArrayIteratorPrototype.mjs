import {
  ObjectValue,
  wellKnownSymbols,
  New as NewValue,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';

function ArrayIteratorPrototype_next() {}

export function CreateArrayIteratorPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);
  proto.Prototype = realmRec.Intrinsics['%IteratorPrototype%'];

  proto.DefineOwnProperty(NewValue('next'), {
    Value: CreateBuiltinFunction(ArrayIteratorPrototype_next, [], realmRec),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Array Iterator'),
    Writable: false,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
