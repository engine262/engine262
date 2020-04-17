import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { ToObject, GetValue } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { NewObjectEnvironment } from '../environment.mjs';
import {
  UpdateEmpty,
  Completion,
  EnsureCompletion,
  Q,
} from '../completion.mjs';

// #sec-with-statement-runtime-semantics-evaluation
//   WithStatement : `with` `(` Expression `)` Statement
export function* Evaluate_WithStatement({ Expression, Statement }) {
  // 1. Let val be the result of evaluating Expression.
  const val = yield* Evaluate(Expression);
  // 2. Let obj be ? ToObject(? GetValue(val)).
  const obj = Q(ToObject(Q(GetValue(val))));
  // 3. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let newEnv be NewObjectEnvironment(obj, oldEnv).
  const newEnv = NewObjectEnvironment(obj, oldEnv);
  // 5. Set the withEnvironment flag of newEnv's EnvironmentRecord to true.
  newEnv.withEnvironment = true;
  // 6. Set the running execution context's LexicalEnvironment to newEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
  // 7. Let C be the result of evaluating Statement.
  const C = EnsureCompletion(yield* Evaluate(Statement));
  // 8. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 9. Return Completion(UpdateEmpty(C, undefined)).
  return Completion(UpdateEmpty(C, Value.undefined));
}
