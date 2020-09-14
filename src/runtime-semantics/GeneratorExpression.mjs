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

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
export function* Evaluate_GeneratorExpression(GeneratorExpression) {
  const { BindingIdentifier, FormalParameters, GeneratorBody } = GeneratorExpression;
  if (!BindingIdentifier) {
    // 1. Return the result of performing NamedEvaluation for this GeneratorExpression with argument "".
    return yield* NamedEvaluation(GeneratorExpression, new Value(''));
  }
  // 1. Let scope be the running execution context's LexicalEnvironment.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let funcEnv be NewDeclarativeEnvironment(scope).
  const funcEnv = NewDeclarativeEnvironment(scope);
  // 3. Let name be StringValue of BindingIdentifier.
  const name = StringValue(BindingIdentifier);
  // 4. Perform funcEnv.CreateImmutableBinding(name, false).
  funcEnv.CreateImmutableBinding(name, Value.false);
  // 5. Let sourceText be the source text matched by GeneratorExpression.
  const sourceText = sourceTextMatchedBy(GeneratorExpression);
  // 6. Let closure be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, funcEnv).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', funcEnv));
  // 7. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 8. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'));
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
