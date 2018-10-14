import {
  GetValue,
  HasOwnProperty,
  PutValue,
  ResolveBinding,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { BindingInitialization_BindingPattern } from './all.mjs';
import {
  isBindingIdentifier,
  isBindingPattern,
} from '../ast.mjs';
import {
  NormalCompletion, Q, ReturnIfAbrupt, X,
} from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';
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
      const lhs = Q(ResolveBinding(bindingId));
      const rhs = yield* Evaluate_Expression(Initializer);
      const value = Q(GetValue(rhs));
      if (IsAnonymousFunctionDefinition(Initializer)) {
        const hasNameProperty = Q(HasOwnProperty(value, new Value('name')));
        if (hasNameProperty === Value.false) {
          X(SetFunctionName(value, bindingId));
        }
      }
      return Q(PutValue(lhs, value));
    }

    case isBindingPattern(VariableDeclaration.id) && VariableDeclaration.init !== null: {
      const {
        id: BindingPattern,
        init: Initializer,
      } = VariableDeclaration;
      const rhs = yield* Evaluate_Expression(Initializer);
      const rval = Q(GetValue(rhs));
      return yield* BindingInitialization_BindingPattern(BindingPattern, rval, Value.undefined);
    }

    default:
      throw outOfRange('Evaluate_VariableDeclaration', VariableDeclaration);
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
