// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { OrdinaryFunctionCreate, SetFunctionName, sourceTextMatchedBy } from '../abstract-ops/all.mjs';

/** http://tc39.es/ecma262/#sec-runtime-semantics-instantiatearrowfunctionexpression */
// ArrowFunction : ArrowParameters `=>` ConciseBody
export function InstantiateArrowFunctionExpression(ArrowFunction, name) {
  const { ArrowParameters, ConciseBody } = ArrowFunction;
  // 1. If name is not present, set name to "".
  if (name === undefined) {
    name = Value('');
  }
  // 2. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 3. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 4. Let sourceText be the source text matched by ArrowFunction.
  const sourceText = sourceTextMatchedBy(ArrowFunction);
  // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, ArrowParameters, ConciseBody, lexical-this, scope, privateScope).
  const closure = OrdinaryFunctionCreate(
    surroundingAgent.intrinsic('%Function.prototype%'),
    sourceText,
    ArrowParameters,
    ConciseBody,
    'lexical-this',
    scope,
    privateScope,
  );
  // 6. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 7. Return closure.
  return closure;
}
