import {
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
  SetFunctionLength,
  SetFunctionName,
  StringCreate,
  SymbolDescriptiveString,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';

function StringConstructor(args, { NewTarget }) {
  let s;
  if (args.length === 0) {
    // String ( )
    s = new Value('');
  } else {
    // String ( value )
    const [value] = args;
    if (Type(NewTarget) === 'Undefined' && Type(value) === 'Symbol') {
      return X(SymbolDescriptiveString(value));
    }
    s = Q(ToString(value));
  }
  if (Type(NewTarget) === 'Undefined') {
    return s;
  }
  return X(StringCreate(s, Q(GetPrototypeFromConstructor(NewTarget, '%StringPrototype%'))));
}

export function CreateString(realmRec) {
  const stringConstructor = CreateBuiltinFunction(StringConstructor, [], realmRec);
  SetFunctionName(stringConstructor, new Value('String'));
  SetFunctionLength(stringConstructor, new Value(1));

  realmRec.Intrinsics['%String%'] = stringConstructor;
}
