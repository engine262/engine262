import {
  surroundingAgent,
  Suspend,
} from '../engine.mjs';
import {
  Assert,
  IsExtensible,
  HasOwnProperty,
  DefinePropertyOrThrow,
  ToInteger,
} from './all.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import { X } from '../completion.mjs';

// #sec-SetFunctionName
export function SetFunctionName(F, name, prefix) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, NewValue('name')).isFalse());
  Assert(Type(name) === 'Symbol' || Type(name) === 'String');
  Assert(!prefix || Type(prefix) === 'String');
  if (Type(name) === 'Symbol') {
    const description = name.Description;
    if (Type(description) === 'Undefined') {
      name = NewValue('');
    } else {
      name = NewValue(`[${description.stringValue()}]`);
    }
  }
  if (prefix !== undefined) {
    name = NewValue(`${prefix.stringValue()} ${name.stringValue()}`);
  }
  return X(DefinePropertyOrThrow(F, NewValue('name'), {
    Value: name,
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));
}

// #sec-SetFunctionLength
export function SetFunctionLength(F, length) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, NewValue('length')).isFalse());
  Assert(Type(length) === 'Number');
  Assert(length.numberValue() >= 0 && X(ToInteger(length)).numberValue() === length.numberValue());
  return X(DefinePropertyOrThrow(F, NewValue('length'), {
    Value: length,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));
}

// #sec-PrepareForTailCall
export function PrepareForTailCall() {
  const leafContext = surroundingAgent.runningExecutionContext;
  Suspend(leafContext);
  surroundingAgent.executionContextStack.pop();
  // Assert: leafContext has no further use. It will never
  // be activated as the running execution context.
}
