import {
  GetValue,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import {
  BindingInitialization_BindingPattern,
  NamedEvaluation_Expression,
} from './all.mjs';
import {
  isBindingIdentifier,
  isBindingPattern,
} from '../ast.mjs';
import { NormalCompletion, Q, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';
import { IsAnonymousFunctionDefinition } from '../static-semantics/all.mjs';
import { Value } from '../value.mjs';

// 13.3.2.4 #sec-variable-statement-runtime-semantics-evaluation
//   VariableDeclaration :
//     BindingIdentifier
//     BindingIdentifier Initializer
//     BindingPattern Initializer
export function* Evaluate_VariableDeclaration(VariableDeclaration) {
  switch (true) {
    case isBindingIdentifier(VariableDeclaration.id) && VariableDeclaration.init === null:
      return new NormalCompletion(undefined);

    case isBindingIdentifier(VariableDeclaration.id) && VariableDeclaration.init !== null: {
      const {
        id: BindingIdentifier,
        init: Initializer,
      } = VariableDeclaration;
      const bindingId = new Value(BindingIdentifier.name);
      const lhs = Q(ResolveBinding(bindingId, undefined, BindingIdentifier.strict));
      let value;
      if (IsAnonymousFunctionDefinition(Initializer)) {
        value = yield* NamedEvaluation_Expression(Initializer, bindingId);
      } else {
        const rhs = yield* Evaluate(Initializer);
        value = Q(GetValue(rhs));
      }
      return Q(PutValue(lhs, value));
    }

    case isBindingPattern(VariableDeclaration.id) && VariableDeclaration.init !== null: {
      const {
        id: BindingPattern,
        init: Initializer,
      } = VariableDeclaration;
      const rhs = yield* Evaluate(Initializer);
      const rval = Q(GetValue(rhs));
      return yield* BindingInitialization_BindingPattern(BindingPattern, rval, Value.undefined);
    }

    default:
      throw new OutOfRange('Evaluate_VariableDeclaration', VariableDeclaration);
  }
}

// 13.3.2.4 #sec-variable-statement-runtime-semantics-evaluation
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

// 13.3.2.4 #sec-variable-statement-runtime-semantics-evaluation
//   VariableStatement : `var` VariableDeclarationList `;`
export function* Evaluate_VariableStatement(VariableStatement) {
  const next = yield* Evaluate_VariableDeclarationList(VariableStatement.declarations);
  ReturnIfAbrupt(next);
  return new NormalCompletion(undefined);
}
