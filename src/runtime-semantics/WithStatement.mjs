import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { NewObjectEnvironment } from '../environment.mjs';
import { Value } from '../value.mjs';
import { GetValue, ToObject } from '../abstract-ops/all.mjs';
import {
  Completion,
  EnsureCompletion,
  Q,
  UpdateEmpty,
} from '../completion.mjs';

// 13.11.7 #sec-with-statement-runtime-semantics-evaluation
// WithStatement : `with` `(` Expression `)` Statement
export function* Evaluate_WithStatement({
  object: Expression,
  body: Statement,
}) {
  const val = yield* Evaluate(Expression);
  const actualVal = Q(GetValue(val));
  const obj = Q(ToObject(actualVal));
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const newEnv = NewObjectEnvironment(obj, oldEnv);
  newEnv.withEnvironment = true;
  surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
  const C = EnsureCompletion(yield* Evaluate(Statement));
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return Completion(UpdateEmpty(C, Value.undefined));
}
