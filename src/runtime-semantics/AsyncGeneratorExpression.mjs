import {
  DefinePropertyOrThrow,
  AsyncGeneratorFunctionCreate,
  ObjectCreate,
  SetFunctionName,
  sourceTextMatchedBy,
  isStrictModeCode,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Descriptor, Value } from '../value.mjs';

// 14.4.13 #sec-generator-function-definitions-runtime-semantics-evaluation
//   AsyncGeneratorExpression :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
export function Evaluate_AsyncGeneratorExpression(AsyncGeneratorExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncGeneratorExpression;
  const strict = isStrictModeCode(AsyncGeneratorExpression);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  let funcEnv = scope;
  let envRec;
  let name;
  if (BindingIdentifier) {
    funcEnv = NewDeclarativeEnvironment(scope);
    envRec = funcEnv.EnvironmentRecord;
    name = new Value(BindingIdentifier.name);
    envRec.CreateImmutableBinding(name, Value.false);
  }
  const closure = X(AsyncGeneratorFunctionCreate('Normal', FormalParameters, AsyncGeneratorExpression, funcEnv, strict));
  const prototype = ObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorPrototype%'));
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
  if (BindingIdentifier) {
    X(SetFunctionName(closure, name));
    envRec.InitializeBinding(name, closure);
  }
  return closure;
}
