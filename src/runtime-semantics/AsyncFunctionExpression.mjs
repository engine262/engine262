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
export function Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
  const { BindingIdentifier, FormalParameters, AsyncFunctionBody } = AsyncFunctionExpression;
  if (BindingIdentifier === null) {
    // 1. Return the result of performing NamedEvaluation for this AsyncFunctionExpression with argument "".
    return NamedEvaluation(AsyncFunctionExpression, new Value(''));
  }
  // 1. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let funcEnv be ! NewDeclarativeEnvironment(scope).
  const funcEnv = X(NewDeclarativeEnvironment(scope));
  // 3. Let envRec be funcEnv's EnvironmentRecord.
  const envRec = funcEnv.EnvironmentRecord;
  // 4. Let name be StringValue of BindingIdentifier.
  const name = StringValue(BindingIdentifier);
  // 5. Perform ! envRec.CreateImmutableBinding(name, false).
  X(envRec.CreateImmutableBinding(name, Value.false));
  // 6. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, FormalParameters, AsyncFunctionBody, non-lexical-this, funcEnv).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionBody, 'non-lexical-this', funcEnv));
  // 7. Perform ! SetFunctionName(closure, name).
  X(SetFunctionName(closure, name));
  // 8. Perform ! envRec.InitializeBinding(name, closure).
  X(envRec.InitializeBinding(name, closure));
  // 9. Set closure.[[SourceText]] to the source text matched by AsyncFunctionExpression.
  closure.sourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  // 10. Return closure.
  return closure;
}
