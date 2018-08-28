import { Evaluate } from '../evaluator.mjs';
import { Q, ReturnIfAbrupt } from '../completion.mjs';
import {
  GetValue,
} from '../abstract-ops/all.mjs';

// #sec-argument-lists-runtime-semantics-argumentlistevaluation
export function ArgumentListEvaluation(ArgumentList) {
  // Arguments : ( )
  if (ArgumentList.length === 0) {
    return [];
  }

  // ArgumentList : ArgumentList , AssignmentExpression
  let preceedingArgs = ArgumentListEvaluation(ArgumentList.slice(0, -1));
  ReturnIfAbrupt(preceedingArgs);
  const ref = Evaluate(ArgumentList[ArgumentList.length - 1]);
  const arg = Q(GetValue(ref));
  preceedingArgs.push(arg);
  return preceedingArgs;
}
