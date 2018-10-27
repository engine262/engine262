import {
  surroundingAgent,
} from '../engine.mjs';
import { directivePrologueContainsUseStrictDirective } from '../ast.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { AsyncFunctionCreate } from '../abstract-ops/all.mjs';

export function Evaluate_AsyncArrowFunction(ArrowFunction) {
  const { params: ArrowParameters } = ArrowFunction;
  const strict = ArrowFunction.body.body
    ? directivePrologueContainsUseStrictDirective(ArrowFunction.body.body)
    : ArrowFunction.body.strict;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters;
  const closure = AsyncFunctionCreate('Arrow', parameters, ArrowFunction, scope, strict);
  return closure;
}
