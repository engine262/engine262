import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { OrdinaryFunctionCreate, SetFunctionName, sourceTextMatchedBy } from '../abstract-ops/all.mjs';

// #sec-runtime-semantics-instantiateasyncarrowfunctionexpression
// AsyncArrowFunction : ArrowParameters `=>` AsyncConciseBody
export function InstantiateAsyncArrowFunctionExpression(AsyncArrowFunction, name) {
  const { ArrowParameters, AsyncConciseBody } = AsyncArrowFunction;
  // 1. If name is not present, set name to "".
  if (name === undefined) {
    name = new Value('');
  }
  // 2. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 3. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 4. Let sourceText be the source text matched by AsyncArrowFunction.
  const sourceText = sourceTextMatchedBy(AsyncArrowFunction);
  // 5. Let parameters be AsyncArrowBindingIdentifier.
  const parameters = ArrowParameters;
  // 6. Let closure be OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, ArrowParameters, AsyncConciseBody, lexical-this, scope, privateScope).
  const closure = OrdinaryFunctionCreate(
    surroundingAgent.intrinsic('%AsyncFunction.prototype%'),
    sourceText,
    parameters,
    AsyncConciseBody,
    'lexical-this',
    scope,
    privateScope,
  );
  // 7. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 8. Return closure.
  return closure;
}
