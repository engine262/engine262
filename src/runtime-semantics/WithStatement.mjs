import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Statement, Evaluate_Expression } from '../evaluator.mjs';
import { NewObjectEnvironment } from '../environment.mjs';
import { New as NewValue } from '../value.mjs';
import { ToObject, GetValue } from '../abstract-ops/all.mjs';
import { Q, Completion, UpdateEmpty } from '../completion.mjs';

// #sec-with-statement-runtime-semantics-evaluation
// WithStatement : `with` `(` Expression `)` Statement
export function Evaluate_WithStatement({
  object: Expression,
  body: Statement,
}) {
  const val = Evaluate_Expression(Expression);
  const obj = Q(ToObject(Q(GetValue(val))));
  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const newEnv = NewObjectEnvironment(obj, oldEnv);
  newEnv.withEnvironment = true;
  surroundingAgent.runningExecutionContext.LexicalEnvironment = newEnv;
  const C = Evaluate_Statement(Statement);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return Completion(UpdateEmpty(C, NewValue(undefined)));
}
