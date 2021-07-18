import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';

// #sec-runtime-semantics-instantiateasyncgeneratorfunctionexpression
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function InstantiateAsyncGeneratorFunctionExpression(AsyncGeneratorExpression, name) {
  const { BindingIdentifier, FormalParameters, AsyncGeneratorBody } = AsyncGeneratorExpression;
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
    // 7. Let source text be the source textmatched by AsyncGeneratorExpression.
    const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
    // 8. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, funcEnv, privateScope).
    const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', funcEnv, privateScope));
    // 9. Perform SetFunctionName(closure, name).
    SetFunctionName(closure, name);
    // 10. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
    const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
    // 11. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
    X(DefinePropertyOrThrow(
      closure,
      new Value('prototype'),
      Descriptor({
        Value: prototype,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.false,
      }),
    ));
    // 12. Perform funcEnv.InitializeBinding(name, closure).
    funcEnv.InitializeBinding(name, closure);
    // 13. Return closure.
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
  // 4. Let sourceText be the source text matched by AsyncGeneratorExpression.
  const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  // 5. Let closure be ! OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, scope, privateScope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope, privateScope));
  // 6. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 7. Let prototype be ! OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
  // 8. Perform ! DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(
    closure,
    new Value('prototype'),
    Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    }),
  ));
  // 9. Return closure.
  return closure;
}
