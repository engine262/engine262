import {
  DefinePropertyOrThrow,
  GeneratorFunctionCreate,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { New as NewValue } from '../value.mjs';

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
export function Evaluate_GeneratorExpression(GeneratorExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = GeneratorExpression;
  const strict = true; // TODO(IsStrict)
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  let funcEnv = scope;
  let envRec;
  let name;
  if (BindingIdentifier) {
    funcEnv = NewDeclarativeEnvironment(scope);
    envRec = funcEnv.EnvironmentRecord;
    name = BindingIdentifier.name;
    envRec.CreateImmutableBinding(name, NewValue(false));
  }
  const closure = X(GeneratorFunctionCreate('Normal', FormalParameters, GeneratorExpression, funcEnv, strict));
  const prototype = ObjectCreate(surroundingAgent.intrinsic('%GeneratorPrototype%'));
  X(DefinePropertyOrThrow(
    closure,
    NewValue('prototype'),
    {
      Value: prototype,
      Writable: true,
      Enumerable: false,
      Configurable: false,
    },
  ));
  if (BindingIdentifier) {
    X(SetFunctionName(closure, name));
    envRec.InitializeBinding(name, closure);
  }
  return closure;
}
