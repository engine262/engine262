// @ts-nocheck
import { JSStringValue, Value } from '../value.mjs';
import {
  Assert,
  PutValue,
  ResolveBinding,
  RequireObjectCoercible,
  GetIterator,
  IteratorClose,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../api.mjs';
import { NormalCompletion, Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  IteratorBindingInitialization_ArrayBindingPattern,
  PropertyBindingInitialization,
  RestBindingInitialization,
} from './all.mjs';

/** https://tc39.es/ecma262/#sec-initializeboundname */
export function InitializeBoundName(name, value, environment) {
  // 1. Assert: Type(name) is String.
  Assert(name instanceof JSStringValue);
  // 2. If environment is not undefined, then
  if (environment !== Value.undefined) {
    // a. Perform environment.InitializeBinding(name, value).
    environment.InitializeBinding(name, value);
    // b. Return NormalCompletion(undefined).
    return NormalCompletion(Value.undefined);
  } else {
    // a. Let lhs be ResolveBinding(name).
    const lhs = ResolveBinding(name, undefined, false);
    // b. Return ? PutValue(lhs, value).
    return Q(PutValue(lhs, value));
  }
}

// ObjectBindingPattern :
//   `{` `}`
//   `{` BindingPropertyList `}`
//   `{` BindingRestProperty `}`
//   `{` BindingPropertyList `,` BindingRestProperty `}`
function* BindingInitialization_ObjectBindingPattern({ BindingPropertyList, BindingRestProperty }, value, environment) {
  // 1. Perform ? PropertyBindingInitialization for BindingPropertyList using value and environment as the arguments.
  const excludedNames = Q(yield* PropertyBindingInitialization(BindingPropertyList, value, environment));
  if (BindingRestProperty) {
    Q(RestBindingInitialization(BindingRestProperty, value, environment, excludedNames));
  }
  // 2. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}

export function* BindingInitialization(node, value, environment) {
  switch (node.type) {
    case 'ForBinding':
      if (node.BindingIdentifier) {
        return yield* BindingInitialization(node.BindingIdentifier, value, environment);
      }
      return yield* BindingInitialization(node.BindingPattern, value, environment);
    case 'ForDeclaration':
      return yield* BindingInitialization(node.ForBinding, value, environment);
    case 'BindingIdentifier': {
      // 1. Let name be StringValue of Identifier.
      const name = StringValue(node);
      // 2. Return ? InitializeBoundName(name, value, environment).
      return Q(InitializeBoundName(name, value, environment));
    }
    case 'ObjectBindingPattern': {
      // 1. Perform ? RequireObjectCoercible(value).
      Q(RequireObjectCoercible(value));
      // 2. Return the result of performing BindingInitialization for ObjectBindingPattern using value and environment as arguments.
      return yield* BindingInitialization_ObjectBindingPattern(node, value, environment);
    }
    case 'ArrayBindingPattern': {
      // 1. Let iteratorRecord be ? GetIterator(value).
      const iteratorRecord = Q(GetIterator(value));
      // 2. Let result be IteratorBindingInitialization of ArrayBindingPattern with arguments iteratorRecord and environment.
      const result = yield* IteratorBindingInitialization_ArrayBindingPattern(node, iteratorRecord, environment);
      // 3. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, result).
      if (iteratorRecord.Done === Value.false) {
        return Q(IteratorClose(iteratorRecord, result));
      }
      // 4. Return result.
      return result;
    }
    default:
      throw new OutOfRange('BindingInitialization', node);
  }
}
