import {
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
  SetFunctionLength,
  SetFunctionName,
  StringCreate,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function StringConstructor(args, { NewTarget }) {
  let s;
  if (args.length === 0) {
    // String ( )
    s = new Value('');
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
  SetFunctionName(stringConstructor, new Value('String'));
  SetFunctionLength(stringConstructor, new Value(1));

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
