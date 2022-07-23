import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  OrdinaryFunctionCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';

// #sec-runtime-semantics-instantiateasyncfunctionexpression
export function InstantiateAsyncFunctionExpression(AsyncFunctionExpression, name) {
  const { BindingIdentifier, FormalParameters, AsyncFunctionBody } = AsyncFunctionExpression;
  if (BindingIdentifier) {
    // 1. Assert: name is not present.
    Assert(name === undefined);
    // 2. Set name to StringValue of BindingIdentifier.
    name = StringValue(BindingIdentifier);
    // 3. Let scope be the LexicalEnvironment of the running execution context.
    const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // 4. Let funcEnv be ! NewDeclarativeEnvironment(scope).
    const funcEnv = X(NewDeclarativeEnvironment(scope));
    // 5. Perform ! funcEnv.CreateImmutableBinding(name, false).
    X(funcEnv.CreateImmutableBinding(name, Value.false));
    // 6. Let privateScope be the running execution context's PrivateEnvironment.
    const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
    // 7. Let sourceText be the source text matched by AsyncFunctionExpression.
    const sourceText = sourceTextMatchedBy(AsyncFunctionExpression);
    // 8. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, funcEnv, privateScope).
    const closure = X(OrdinaryFunctionCreate(
      surroundingAgent.intrinsic('%AsyncFunction.prototype%'),
      sourceText,
      FormalParameters,
      AsyncFunctionBody,
      'non-lexical-this',
      funcEnv,
      privateScope,
    ));
    // 9. Perform ! SetFunctionName(closure, name).
    X(SetFunctionName(closure, name));
    // 10. Perform ! funcEnv.InitializeBinding(name, closure).
    X(funcEnv.InitializeBinding(name, closure));
    // 11. Return closure.
    return closure;
  }
  // 1. If name is not present, set name to "".
  if (name === undefined) {
    name = new Value('');
  }
  // 2. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 3. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 4. Let sourceText be the source text matched by AsyncFunctionExpression.
  const sourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  // 5. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, scope, privateScope).
  const closure = X(OrdinaryFunctionCreate(
    surroundingAgent.intrinsic('%AsyncFunction.prototype%'),
    sourceText,
    FormalParameters,
    AsyncFunctionBody,
    'non-lexical-this',
    scope,
    privateScope,
  ));
  // 6. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 7. Return closure.
  return closure;
}
