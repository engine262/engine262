import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Expression, Evaluate_StatementList } from '../evaluator.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { GetValue, StrictEqualityComparison } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import {
  Q,
  Completion,
  NormalCompletion,
  AbruptCompletion,
  UpdateEmpty,
  EnsureCompletion,
} from '../completion.mjs';
import { BlockDeclarationInstantiation } from './BlockStatement.mjs';

// #sec-runtime-semantics-caseclauseisselected
function* CaseClauseIsSelected(C, input) {
  // Assert: C is an instance of the production CaseClause : `case` Expression : StatementList.
  const exprRef = yield* Evaluate_Expression(C.test);
  const clauseSelector = Q(GetValue(exprRef));
  return StrictEqualityComparison(input, clauseSelector);
}

// #sec-runtime-semantics-caseblockevaluation
// CaseBlock :
//   `{` `}`
//   `{` CaseClauses `}`
//   `{` CaseClauses DefaultClause CaseClauses `}`
function* CaseBlockEvaluation(CaseBlock, input) {
  if (CaseBlock.length === 0) {
    return NormalCompletion(new Value(undefined));
  }

  const defaultIndex = CaseBlock.findIndex((c) => c.test === null);
  if (defaultIndex !== -1) {
    // CaseBlock : `{` CaseClauses DefaultClause CaseClauses `}`
    const firstCaseClauses = CaseBlock.slice(0, defaultIndex);
    const secondCaseClauses = CaseBlock.slice(defaultIndex + 1);
    const DefaultClause = CaseBlock[defaultIndex];

    let V = new Value(undefined);
    let A;
    if (firstCaseClauses.length > 0) {
      A = firstCaseClauses;
    } else {
      A = [];
    }
    let found = false;
    for (const C of A) {
      if (found === false) {
        found = Q(yield* CaseClauseIsSelected(C, input)).isTrue();
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
          foundInB = Q(CaseClauseIsSelected(C, input)).isTrue();
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
      return NormalCompletion(V);
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
    return NormalCompletion(V);
  } else {
    // CaseBlock : `{` CaseClauses `}`
    let V = new Value(undefined);
    // Let A be the List of CaseClause items in CaseClauses, in source text order.
    const A = CaseBlock;
    let found = false;
    for (const C of A) {
      if (found === false) {
        found = Q(CaseClauseIsSelected(C, input)).isTrue();
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

    return NormalCompletion(V);
  }
}

// #sec-switch-statement-runtime-semantics-evaluation
// SwitchStatement : `switch` `(` Expression `)` CaseBlock
export function* Evaluate_SwitchStatement({
  discriminant: Expression,
  cases: CaseBlock,
}) {
  const exprRef = yield* Evaluate_Expression(Expression);
  const switchValue = Q(GetValue(exprRef));
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(CaseBlock, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const R = yield* CaseBlockEvaluation(CaseBlock, switchValue);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return R;
}
