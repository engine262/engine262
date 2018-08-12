import {
  CreateBuiltinFunction,
  ToString,
  GetPrototypeFromConstructor,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
  UndefinedValue,
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
  if (NewTarget instanceof UndefinedValue) {
    return s;
  }
  return StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%StringPrototype%')));
}

export function CreateString(realmRec) {
  const stringConstructor = CreateBuiltinFunction(StringConstructor, [], realmRec);
  stringConstructor.properties.set('length', NewValue(1));

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
