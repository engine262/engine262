import {
  DefinePropertyOrThrow,
  OrdinaryFunctionCreate,
  OrdinaryObjectCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Descriptor, Value } from '../value.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { NamedEvaluation } from './all.mjs';

// #sec-asyncgenerator-definitions-evaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function* Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
  const { BindingIdentifier, FormalParameters, AsyncGeneratorBody } = AsyncGeneratorExpression;
  if (!BindingIdentifier) {
    // 1. Return the result of performing NamedEvaluation for this AsyncGeneratorExpression with argument "".
    return yield* NamedEvaluation(AsyncGeneratorExpression, new Value(''));
  }
  // 1. Let scope be the running execution context's LexicalEnvironment.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let funcEnv be NewDeclarativeEnvironment(scope).
  const funcEnv = NewDeclarativeEnvironment(scope);
  // 3. Let name be StringValue of BindingIdentifier.
  const name = StringValue(BindingIdentifier);
  // 4. Perform funcEnv.CreateImmutableBinding(name, false).
  funcEnv.CreateImmutableBinding(name, Value.false);
  // 5. Let source text be the source textmatched by AsyncGeneratorExpression.
  const sourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  // 6. Let closure be OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, funcEnv).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', funcEnv));
  // 7. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 8. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
  // 9. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
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
  // 10. Perform funcEnv.InitializeBinding(name, closure).
  funcEnv.InitializeBinding(name, closure);
  // 11. Return closure.
  return closure;
}
