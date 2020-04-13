import { Type, Value } from '../value.mjs';
import {
  Assert,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { NormalCompletion, Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-initializeboundname
export function InitializeBoundName(name, value, environment) {
  // 1. Assert: Type(name) is String.
  Assert(Type(name) === 'String');
  // 2. If environment is not undefined, then
  if (environment !== Value.undefined) {
    // a. If environment is not undefined, then
    const env = environment.EnvironmentRecord;
    // b. Perform env.InitializeBinding(name, value).
    env.InitializeBinding(name, value);
    // c. Perform env.InitializeBinding(name, value).
    return new NormalCompletion(Value.undefined);
  } else {
    // a. Let lhs be ResolveBinding(name).
    const lhs = ResolveBinding(name, undefined, false);
    // b. Return ? PutValue(lhs, value).
    return Q(PutValue(lhs, value));
  }
}

export function BindingInitialization(node, value, environment) {
  switch (node.type) {
    case 'BindingIdentifier': {
      // 1. Let name be StringValue of Identifier.
      const name = StringValue(node);
      // 2. Return ? InitializeBoundName(name, value, environment).
      return Q(InitializeBoundName(name, value, environment));
    }
    default:
      throw new OutOfRange('BindingInitialization', node);
  }
}
