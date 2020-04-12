import { Evaluate } from '../evaluator.mjs';
import {
  EnsureCompletion,
  ReturnIfAbrupt,
  UpdateEmpty,
  NormalCompletion,
} from '../completion.mjs';

// #sec-block-runtime-semantics-evaluation
export function* Evaluate_StatementList(StatementList) {
  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  let sl = yield* Evaluate(StatementList[0]);
  if (StatementList.length === 1) {
    return sl;
  }

  for (const StatementListItem of StatementList.slice(1)) {
    ReturnIfAbrupt(sl);
    let s = yield* Evaluate(StatementListItem);
    // We don't always return a Completion value, but here we actually need it
    // to be a Completion.
    s = EnsureCompletion(s);
    sl = UpdateEmpty(s, sl);
  }

  return sl;
}
