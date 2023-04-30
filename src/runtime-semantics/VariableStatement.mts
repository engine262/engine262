// @ts-nocheck
import {
  GetValue,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import { NormalCompletion, Q, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue, IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Value } from '../value.mjs';
import { NamedEvaluation, BindingInitialization } from './all.mjs';

/** http://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation */
//   VariableDeclaration :
//     BindingIdentifier
//     BindingIdentifier Initializer
//     BindingPattern Initializer
function* Evaluate_VariableDeclaration({ BindingIdentifier, Initializer, BindingPattern }) {
  if (BindingIdentifier) {
    if (!Initializer) {
      // 1. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(BindingIdentifier);
    // 2. Let lhs be ? ResolveBinding(bindingId).
    const lhs = Q(ResolveBinding(bindingId, undefined, BindingIdentifier.strict));
    // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then
    let value;
    if (IsAnonymousFunctionDefinition(Initializer)) {
      // a. Let value be NamedEvaluation of Initializer with argument bindingId.
      value = yield* NamedEvaluation(Initializer, bindingId);
    } else { // 4. Else,
      // a. Let rhs be the result of evaluating Initializer.
      const rhs = yield* Evaluate(Initializer);
      // b. Let value be ? GetValue(rhs).
      value = Q(GetValue(rhs));
    }
    // 5. Return ? PutValue(lhs, value).
    return Q(PutValue(lhs, value));
  }
  // 1. Let rhs be the result of evaluating Initializer.
  const rhs = yield* Evaluate(Initializer);
  // 2. Let rval be ? GetValue(rhs).
  const rval = Q(GetValue(rhs));
  // 3. Return the result of performing BindingInitialization for BindingPattern passing rval and undefined as arguments.
  return yield* BindingInitialization(BindingPattern, rval, Value.undefined);
}

/** http://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation */
//   VariableDeclarationList : VariableDeclarationList `,` VariableDeclaration
//
// (implicit)
//   VariableDeclarationList : VariableDeclaration
export function* Evaluate_VariableDeclarationList(VariableDeclarationList) {
  let next;
  for (const VariableDeclaration of VariableDeclarationList) {
    next = yield* Evaluate_VariableDeclaration(VariableDeclaration);
    ReturnIfAbrupt(next);
  }
  return next;
}

/** http://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation */
//   VariableStatement : `var` VariableDeclarationList `;`
export function* Evaluate_VariableStatement({ VariableDeclarationList }) {
  const next = yield* Evaluate_VariableDeclarationList(VariableDeclarationList);
  ReturnIfAbrupt(next);
  return NormalCompletion(undefined);
}
