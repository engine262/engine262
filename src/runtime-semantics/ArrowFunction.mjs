import {
  surroundingAgent,
} from '../engine.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { FunctionCreate } from '../abstract-ops/all.mjs';

export function Evaluate_ArrowFunction(ArrowFunction) {
  const { params: ArrowParameters } = ArrowFunction;
  const strict = true; // TODO(IsStrict)
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters;
  const closure = FunctionCreate('Arrow', parameters, ArrowFunction, scope, strict);
  return closure;
}
