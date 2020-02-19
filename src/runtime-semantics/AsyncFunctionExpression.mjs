import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  OrdinaryFunctionCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { X } from '../completion.mjs';
import { NamedEvaluation } from './all.mjs';

// #sec-async-function-definitions-runtime-semantics-evaluation
//   AsyncFunctionExpression :
//     `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
//     `async` `function` BindingIdentifier `(` FormalParameters `)` `{` AsyncFunctionBody `}`
export function* Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
  const { BindingIdentifier, FormalParameters, AsyncFunctionBody } = AsyncFunctionExpression;
  if (!BindingIdentifier) {
    // 1. Return the result of performing NamedEvaluation for this AsyncFunctionExpression with argument "".
    return yield* NamedEvaluation(AsyncFunctionExpression, new Value(''));
  }
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let funcEnv be ! NewDeclarativeEnvironment(scope).
  const funcEnv = X(NewDeclarativeEnvironment(scope));
  // 3. Let name be StringValue of BindingIdentifier.
  const name = StringValue(BindingIdentifier);
  // 4. Perform ! funcEnv.CreateImmutableBinding(name, false).
  X(funcEnv.CreateImmutableBinding(name, Value.false));
  // 5. Let sourceText be the source text matched by AsyncFunctionExpression.
  const sourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  // 6. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, funcEnv).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', funcEnv));
  // 7. Perform ! SetFunctionName(closure, name).
  X(SetFunctionName(closure, name));
  // 8. Perform ! funcEnv.InitializeBinding(name, closure).
  X(funcEnv.InitializeBinding(name, closure));
  // 9. Return closure.
  return closure;
}
