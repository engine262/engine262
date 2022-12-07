import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  OrdinaryFunctionCreate,
  SetFunctionName,
  MakeConstructor,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';

/** http://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionexpression  */
//   FunctionExpression :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
export function InstantiateOrdinaryFunctionExpression(FunctionExpression, name) {
  const { BindingIdentifier, FormalParameters, FunctionBody } = FunctionExpression;
  if (BindingIdentifier) {
    // 1. Assert: name is not present.
    Assert(name === undefined);
    // 2. Set name to StringValue of BindingIdentifier.
    name = StringValue(BindingIdentifier);
    // 3. Let scope be the running execution context's LexicalEnvironment.
    const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
    // 4. Let funcEnv be NewDeclarativeEnvironment(scope).
    const funcEnv = NewDeclarativeEnvironment(scope);
    // 5. Perform funcEnv.CreateImmutableBinding(name, false).
    funcEnv.CreateImmutableBinding(name, Value.false);
    // 6. Let privateScope be the running execution context's PrivateEnvironment.
    const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
    // 7. Let sourceText be the source text matched by FunctionExpression.
    const sourceText = sourceTextMatchedBy(FunctionExpression);
    // 8. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, funcEnv, privateScope).
    const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', funcEnv, privateScope);
    // 9. Perform SetFunctionName(closure, name).
    SetFunctionName(closure, name);
    // 10. Perform MakeConstructor(closure).
    MakeConstructor(closure);
    // 11. Perform funcEnv.InitializeBinding(name, closure).
    funcEnv.InitializeBinding(name, closure);
    // 12. Return closure.
    return closure;
  }
  // 1. If name is not present, set name to "".
  if (name === undefined) {
    name = new Value('');
  }
  // 2. Let scope be the running execution context's LexicalEnvironment.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 3. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 4. Let sourceText be the source text matched by FunctionExpression.
  const sourceText = sourceTextMatchedBy(FunctionExpression);
  // 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, scope, privateScope).
  const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope, privateScope);
  // 6. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 7. Perform MakeConstructor(closure).
  MakeConstructor(closure);
  // 8. Return closure.
  return closure;
}
