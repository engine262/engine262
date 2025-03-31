import { surroundingAgent } from '../host-defined/engine.mts';
import { Value } from '../value.mts';
import { ToObject, GetValue } from '../abstract-ops/all.mts';
import { Evaluate } from '../evaluator.mts';
import { ObjectEnvironmentRecord } from '../environment.mts';
import {
  UpdateEmpty,
  Completion,
  EnsureCompletion,
  Q,
} from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-with-statement-runtime-semantics-evaluation */
//   WithStatement : `with` `(` Expression `)` Statement
export function* Evaluate_WithStatement({ Expression, Statement }: ParseNode.WithStatement) {
  // 1. Let val be the result of evaluating Expression.
  const val = yield* Evaluate(Expression);
  // 2. Let obj be ? ToObject(? GetValue(val)).
  const obj = Q(ToObject(Q(yield* GetValue(val))));
  // 3. Let oldEnv be the running execution context's LexicalEnvironment.
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let newEnv be NewObjectEnvironment(obj, true, oldEnv).
  const newEnv = new ObjectEnvironmentRecord(obj, Value.true, oldEnv);
  // 5. Set the running execution context's LexicalEnvironment to newEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
  // 6. Let C be the result of evaluating Statement.
  const C = EnsureCompletion(yield* Evaluate(Statement));
  // 7. Set the running execution context's LexicalEnvironment to oldEnv.
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  // 8. Return Completion(UpdateEmpty(C, undefined)).
  return Completion(UpdateEmpty(C, Value.undefined));
}
