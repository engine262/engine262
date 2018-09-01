import { surroundingAgent } from '../engine.mjs';
import {
  DefinePropertyOrThrow,
  CreateDataProperty,
  ToString,
  ObjectCreate,
} from './all.mjs';
import { New as NewValue, wellKnownSymbols } from '../value.mjs';
import { X } from '../completion.mjs';

// #sec-CreateUnmappedArgumentsObject
export function CreateUnmappedArgumentsObject(argumentsList) {
  const len = argumentsList.length;
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'), ['ParameterMap']);
  obj.ParameterMap = NewValue(undefined);
  DefinePropertyOrThrow(obj, NewValue('length'), {
    Value: NewValue(len),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    CreateDataProperty(obj, X(ToString(NewValue(index)), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, {
    Value: surroundingAgent.intrinsic('%ArrayProto_values%'),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  }));
  X(DefinePropertyOrThrow(obj, NewValue('callee'), {
    Get: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Set: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Eumerable: false,
    Configurable: false,
  }));
  return obj;
}
