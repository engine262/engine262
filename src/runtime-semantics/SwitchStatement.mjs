import { surroundingAgent } from '../engine.mjs';
import { Evaluate, Evaluate_StatementList } from '../evaluator.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { GetValue, StrictEqualityComparison } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import {
  AbruptCompletion,
  Completion,
  EnsureCompletion,
  NormalCompletion,
  Q,
  UpdateEmpty,
} from '../completion.mjs';
import { BlockDeclarationInstantiation } from './BlockStatement.mjs';

// 13.12.10 #sec-runtime-semantics-caseclauseisselected
function* CaseClauseIsSelected(C, input) {
  // Assert: C is an instance of the production CaseClause : `case` Expression : StatementList.
  const exprRef = yield* Evaluate(C.test);
  const clauseSelector = Q(GetValue(exprRef));
  return StrictEqualityComparison(input, clauseSelector);
}

// 13.12.9 #sec-runtime-semantics-caseblockevaluation
// CaseBlock :
//   `{` `}`
//   `{` CaseClauses `}`
//   `{` CaseClauses DefaultClause CaseClauses `}`
function* CaseBlockEvaluation(CaseBlock, input) {
  if (CaseBlock.length === 0) {
    return new NormalCompletion(Value.undefined);
  }

  const defaultIndex = CaseBlock.findIndex((c) => c.test === null);
  if (defaultIndex !== -1) {
    // CaseBlock : `{` CaseClauses DefaultClause CaseClauses `}`
    const firstCaseClauses = CaseBlock.slice(0, defaultIndex);
    const secondCaseClauses = CaseBlock.slice(defaultIndex + 1);
    const DefaultClause = CaseBlock[defaultIndex];

    let V = Value.undefined;
    let A;
    if (firstCaseClauses.length > 0) {
      A = firstCaseClauses;
    } else {
      A = [];
    }
    let found = false;
    for (const C of A) {
      if (found === false) {
        found = Q(yield* CaseClauseIsSelected(C, input)) === Value.true;
      }
      if (found === true) {
        const R = EnsureCompletion(yield* Evaluate_StatementList(C.consequent));
        if (R.Value !== undefined) {
          V = R.Value;
        }
        if (R instanceof AbruptCompletion) {
          return Completion(UpdateEmpty(R, V));
        }
      }
    }
    let foundInB = false;
    let B;
    if (secondCaseClauses.length > 0) {
      B = secondCaseClauses;
    } else {
      B = [];
    }
    if (found === false) {
      for (const C of B) {
        if (foundInB === false) {
          foundInB = Q(CaseClauseIsSelected(C, input)) === Value.true;
        }
        if (foundInB === true) {
          const R = EnsureCompletion(yield* Evaluate_StatementList(C.consequent));
          if (R.Value !== undefined) {
            V = R.Value;
          }
          if (R instanceof AbruptCompletion) {
            return Completion(UpdateEmpty(R, V));
          }
        }
      }
    }
    if (foundInB === true) {
      return new NormalCompletion(V);
    }
    const R = EnsureCompletion(yield* Evaluate_StatementList(DefaultClause.consequent));
    if (R.Value !== undefined) {
      V = R.Value;
    }
    if (R instanceof AbruptCompletion) {
      return Completion(UpdateEmpty(R, V));
    }
    for (const C of B) {
      const R = EnsureCompletion(yield* Evaluate_StatementList(C.consequent)); // eslint-disable-line no-shadow
      if (R.Value !== undefined) {
        V = R.Value;
      }
      if (R instanceof AbruptCompletion) {
        return Completion(UpdateEmpty(R, V));
      }
    }
    return new NormalCompletion(V);
  } else {
    // CaseBlock : `{` CaseClauses `}`
    let V = Value.undefined;
    // Let A be the List of CaseClause items in CaseClauses, in source text order.
    const A = CaseBlock;
    let found = false;
    for (const C of A) {
      if (found === false) {
        found = Q(CaseClauseIsSelected(C, input)) === Value.true;
      }
      if (found === true) {
        const R = EnsureCompletion(yield* Evaluate_StatementList(C.consequent));
        if (R.Value !== undefined) {
          V = R.Value;
        }
        if (R instanceof AbruptCompletion) {
          return Completion(UpdateEmpty(R, V));
        }
      }
    }

    return new NormalCompletion(V);
  }
}

// 13.12.11 #sec-switch-statement-runtime-semantics-evaluation
// SwitchStatement : `switch` `(` Expression `)` CaseBlock
export function* Evaluate_SwitchStatement({
  discriminant: Expression,
  cases: CaseBlock,
}) {
  const exprRef = yield* Evaluate(Expression);
  const switchValue = Q(GetValue(exprRef));
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(CaseBlock, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const R = yield* CaseBlockEvaluation(CaseBlock, switchValue);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return R;
}
