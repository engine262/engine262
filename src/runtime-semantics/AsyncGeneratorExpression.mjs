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
import { NamedEvaluation_AsyncGeneratorExpression } from './all.mjs';

// 14.4.14 #sec-generator-function-definitions-runtime-semantics-evaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncGeneratorExpression;
  if (!BindingIdentifier) {
    return NamedEvaluation_AsyncGeneratorExpression(AsyncGeneratorExpression, new Value(''));
  }
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  envRec.CreateImmutableBinding(name, Value.false);
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), FormalParameters, AsyncGeneratorExpression, 'non-lexical-this', funcEnv));
  X(SetFunctionName(closure, name));
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%'));
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
  closure.SourceText = sourceTextMatchedBy(AsyncGeneratorExpression);
  envRec.InitializeBinding(name, closure);
  return closure;
}
