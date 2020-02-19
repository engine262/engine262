import { Value } from '../value.mjs';
import {
  GetV,
  GetValue,
  PutValue,
  ResolveBinding,
  InitializeReferencedBinding,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue, IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Q } from '../completion.mjs';
import {
  NamedEvaluation,
  BindingInitialization,
} from './all.mjs';

// #sec-runtime-semantics-keyedbindinginitialization
export function* KeyedBindingInitialization(node, value, environment, propertyName) {
  if (node.type === 'BindingElement') {
    // 1. Let v be ? GetV(value, propertyName).
    let v = Q(GetV(value, propertyName));
    // 2. If Initializer is present and v is undefined, then
    if (node.Initializer && v === Value.undefined) {
      // a. Let defaultValue be the result of evaluating Initializer.
      const defaultValue = yield* Evaluate(node.Initializer);
      // b. Set v to ? GetValue(defaultValue).
      v = Q(GetValue(defaultValue));
    }
    // 2. Return the result of performing BindingInitialization for BindingPattern passing v and environment as arguments.
    return yield* BindingInitialization(node.BindingPattern, v, environment);
  } else {
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(node.BindingIdentifier);
    // 2. Let lhs be ? ResolveBinding(bindingId, environment).
    const lhs = Q(ResolveBinding(bindingId, environment));
    // 3. Let v be ? GetV(value, propertyName).
    let v = Q(GetV(value, propertyName));
    if (node.Initializer && v === Value.undefined) {
      // a. If IsAnonymousFunctionDefinition(Initializer) is true, then
      if (IsAnonymousFunctionDefinition(node.Initializer)) {
        // i. Set v to the result of performing NamedEvaluation for Initializer with argument bindingId.
        v = yield* NamedEvaluation(node.Initializer, bindingId);
      } else { // b. Else,
        // i. Let defaultValue be the result of evaluating Initializer.
        const defaultValue = yield* Evaluate(node.Initializer);
        // ii. Set v to ? GetValue(defaultValue).
        v = Q(GetValue(defaultValue));
      }
    }
    // 5. If environment is undefined, return ? PutValue(lhs, v).
    if (environment === Value.undefined) {
      return Q(PutValue(lhs, v));
    }
    // 6. Return InitializeReferencedBinding(lhs, v).
    return InitializeReferencedBinding(lhs, v);
  }
}
