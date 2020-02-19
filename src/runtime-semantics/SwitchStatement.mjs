import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Assert, GetValue, StrictEqualityComparison } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import {
  Completion,
  AbruptCompletion,
  NormalCompletion,
  EnsureCompletion,
  UpdateEmpty,
  Q,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { BlockDeclarationInstantiation } from './all.mjs';

// #sec-runtime-semantics-caseclauseisselected
function* CaseClauseIsSelected(C, input) {
  // 1. Assert: C is an instance of the production  CaseClause : `case` Expression `:` StatementList?.
  Assert(C.type === 'CaseClause');
  // 2. Let exprRef be the result of evaluating the Expression of C.
  const exprRef = yield* Evaluate(C.Expression);
  // 3. Let clauseSelector be ? GetValue(exprRef).
  const clauseSelector = Q(GetValue(exprRef));
  // 4. Return the result of performing Strict Equality Comparison input === clauseSelector.
  return StrictEqualityComparison(input, clauseSelector);
}

// #sec-runtime-semantics-caseblockevaluation
//   CaseBlock :
//     `{` `}`
//     `{` CaseClauses `}`
//     `{` CaseClauses? DefaultClause CaseClauses? `}`
function* CaseBlockEvaluation({ CaseClauses_a, DefaultClause, CaseClauses_b }, input) {
  switch (true) {
    case CaseClauses_a === null && DefaultClause === null && CaseClauses_b === null: {
      // 1. Return NormalCompletion(undefined).
      return NormalCompletion(Value.undefined);
    }
    case CaseClauses_a !== null && DefaultClause === null && CaseClauses_b === null: {
      // 1. Let V be undefined.
      let V = Value.undefined;
      // 2. Let A be the List of CaseClause items in CaseClauses, in source text order.
      const A = CaseClauses_a;
      // 3. Let found be false.
      let found = false;
      // 4. For each CaseClause C in A, do
      for (const C of A) {
        // a. If found is false, then
        if (found === false) {
          // i. Set found to ? CaseClauseIsSelected(C, input).
          found = Q(yield* CaseClauseIsSelected(C, input));
        }
        // b. If found is true, them
        if (found === true) {
          // i. Let R be the result of evaluating C.
          const R = EnsureCompletion(yield* Evaluate(C));
          // ii. If R.[[Value]] is not empty, set V to R.[[Value]].
          if (R.Value !== undefined) {
            V = R.Value;
          }
          // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).
          if (R instanceof AbruptCompletion) {
            return Completion(UpdateEmpty(R, V));
          }
        }
      }
      // 5. Return NormalCompletion(V).
      return NormalCompletion(V);
    }
    case DefaultClause !== null: {
      // 1. Let V be undefined.
      let V = Value.undefined;
      // 2. If the first CaseClauses is present, then
      let A;
      if (CaseClauses_a !== null) {
        // a. Let A be the List of CaseClause items in the first CaseClauses, in source text order.
        A = CaseClauses_a;
      } else { // 3. Else,
        // a. Let A be « ».
        A = [];
      }
      let found = false;
      // 4. For each CaseClause C in A, do
      for (const C of A) {
        // a. If found is false, then
        if (found === false) {
          // i. Set found to ? CaseClauseIsSelected(C, input).
          found = Q(yield* CaseClauseIsSelected(C, input));
        }
        // b. If found is true, them
        if (found === true) {
          // i. Let R be the result of evaluating C.
          const R = EnsureCompletion(yield* Evaluate(C));
          // ii. If R.[[Value]] is not empty, set V to R.[[Value]].
          if (R.Value !== undefined) {
            V = R.Value;
          }
          // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).
          if (R instanceof AbruptCompletion) {
            return Completion(UpdateEmpty(R, V));
          }
        }
      }
      // 6. Let foundInB be false.
      let foundInB = false;
      // 7. If the second CaseClauses is present, then
      let B;
      if (CaseClauses_b !== null) {
        // a. Let B be the List of CaseClause items in the second CaseClauses, in source text order.
        B = CaseClauses_b;
      } else { // 8. Else,
        // a. Let B be « ».
        B = [];
      }
      // 9. If found is false, then
      if (found === false) {
        // a. For each CaseClause C in B, do
        for (const C of B) {
          // a. If foundInB is false, then
          if (foundInB === false) {
            // i. Set foundInB to ? CaseClauseIsSelected(C, input).
            foundInB = Q(yield* CaseClauseIsSelected(C, input));
          }
          // b. If foundInB is true, them
          if (foundInB === true) {
            // i. Let R be the result of evaluating C.
            const R = EnsureCompletion(yield* Evaluate(C));
            // ii. If R.[[Value]] is not empty, set V to R.[[Value]].
            if (R.Value !== undefined) {
              V = R.Value;
            }
            // iii. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).
            if (R instanceof AbruptCompletion) {
              return Completion(UpdateEmpty(R, V));
            }
          }
        }
      }
      // 10. If foundInB is true, return NormalCompletion(V).
      if (foundInB === true) {
        return NormalCompletion(V);
      }
      // 11. Let R be the result of evaluating DefaultClause.
      const R = EnsureCompletion(yield* Evaluate(DefaultClause));
      // 12. If R.[[Value]] is not empty, set V to R.[[Value]].
      if (R.Value !== undefined) {
        V = R.Value;
      }
      // 13. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).
      if (R instanceof AbruptCompletion) {
        return Completion(UpdateEmpty(R, V));
      }
      // 14. NOTE: The following is another complete iteration of the second CaseClauses.
      // 15. For each CaseClause C in B, do
      for (const C of B) {
        // a. Let R be the result of evaluating CaseClause C.
        const R = EnsureCompletion(yield* Evaluate(C));
        // b. If R.[[Value]] is not empty, set V to R.[[Value]].
        if (R.Value !== undefined) {
          V = R.Value;
        }
        // c. If R is an abrupt completion, return Completion(UpdateEmpty(R, V)).
        if (R instanceof AbruptCompletion) {
          return Completion(UpdateEmpty(R, V));
        }
      }
      // 16. Return NormalCompletion(V).
      //
      return NormalCompletion(V);
    }
    default:
      throw new OutOfRange('CaseBlockEvaluation');
  }
}

// #sec-switch-statement-runtime-semantics-evaluation
//   SwitchStatement :
//     `switch` `(` Expression `)` CaseBlock
export function* Evaluate_SwitchStatement({ Expression, CaseBlock }) {
  // 1. Let exprRef be the result of evaluating Expression.
  const exprRef = yield* Evaluate(Expression);
  // 2. Let switchValue be ? GetValue(exprRef).
  const switchValue = Q(GetValue(exprRef));
  // 3. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let blockEnv be NewDeclarativeEnvironment(oldEnv).
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  // 5. Perform BlockDeclarationInstantiation(CaseBlock, blockEnv).
  BlockDeclarationInstantiation(CaseBlock, blockEnv);
  // 6. Set the running execution context's LexicalEnvironment to blockEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  // 7. Let R be CaseBlockEvaluation of CaseBlock with argument switchValue.
  const R = yield* CaseBlockEvaluation(CaseBlock, switchValue);
  // 8. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 9. return R.
  return R;
}
