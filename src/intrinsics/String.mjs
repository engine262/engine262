import {
  CreateBuiltinFunction,
  ToString,
  GetPrototypeFromConstructor,
} from '../abstract-ops/all.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function StringConstructor(realm, args, { NewTarget }) {
  let s;
  if (args.length === 0) {
    // String ( )
    s = NewValue('');
  } else {
    // String ( value )
    const [value] = args;
    s = Q(ToString(value));
  }
  if (Type(NewTarget) === 'Undefined') {
    return s;
  }
  return StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%StringPrototype%')));
}

export function CreateString(realmRec) {
  const stringConstructor = CreateBuiltinFunction(StringConstructor, [], realmRec);
  stringConstructor.properties.set(NewValue('length'), NewValue(1));

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
