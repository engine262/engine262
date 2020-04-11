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
import { NamedEvaluation_GeneratorExpression } from './all.mjs';

// 14.4.14 #sec-generator-function-definitions-runtime-semantics-evaluation
//   GeneratorExpression :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
export function Evaluate_GeneratorExpression(GeneratorExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = GeneratorExpression;
  if (!BindingIdentifier) {
    return NamedEvaluation_GeneratorExpression(GeneratorExpression, new Value(''));
  }
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  envRec.CreateImmutableBinding(name, Value.false);
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), FormalParameters, GeneratorExpression, 'non-lexical-this', funcEnv));
  X(SetFunctionName(closure, name));
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%'));
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
  closure.SourceText = sourceTextMatchedBy(GeneratorExpression);
  envRec.InitializeBinding(name, closure);
  return closure;
}
