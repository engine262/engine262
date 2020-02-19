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
export function Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
  const { BindingIdentifier, FormalParameters, AsyncGeneratorBody } = AsyncGeneratorExpression;
  if (BindingIdentifier === null) {
    // 1. Return the result of performing NamedEvaluation for this AsyncGeneratorExpression with argument "".
    return NamedEvaluation(AsyncGeneratorExpression, new Value(''));
  }
  // 1. Let scope be the running execution context's LexicalEnvironment.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Let funcEnv be NewDeclarativeEnvironment(scope).
  const funcEnv = NewDeclarativeEnvironment(scope);
  // 3. Let envRec be funcEnv's EnvironmentRecord.
  const envRec = funcEnv.EnvironmentRecord;
  // 4. Let name be StringValue of BindingIdentifier.
  const name = StringValue(BindingIdentifier);
  // 5. Perform envRec.CreateImmutableBinding(name, false).
  envRec.CreateImmutableBinding(name, Value.false);
  // 6. Let closure be OrdinaryFunctionCreate(%AsyncGenerator%, FormalParameters, AsyncGeneratorBody, non-lexical-this, funcEnv).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGenerator%'), FormalParameters, AsyncGeneratorBody, 'non-lexical-this', funcEnv));
  // 7. Perform SetFunctionName(closure, name).
  SetFunctionName(closure, name);
  // 8. Let prototype be OrdinaryObjectCreate(%AsyncGenerator.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%'));
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
  // 10. Perform envRec.InitializeBinding(name, closure).
  envRec.InitializeBinding(name, closure);
  // 11. Set closure.[[SourceText]] to the source text matched by AsyncGeneratorExpression.
  closure.SourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  // 12. Return closure.
  return closure;
}
