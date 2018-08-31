import {
  surroundingAgent,
} from '../engine.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { FunctionCreate } from '../abstract-ops/all.mjs';

export function Evaluate_ArrowFunction({
  params: ArrowParameters,
  body: ConciseBody,
  IsStrict,
}) {
  const strict = IsStrict;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters; // CoveredFormalsList(ArrowParameters);
  const closure = FunctionCreate('Arrow', parameters, ConciseBody, scope, strict);
  return closure;
}
