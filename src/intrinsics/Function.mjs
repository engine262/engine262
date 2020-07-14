import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-function-p1-p2-pn-body
function FunctionConstructor(args, { NewTarget }) {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, normal, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'normal', args));
}

export function BootstrapFunction(realmRec) {
  const cons = BootstrapConstructor(realmRec, FunctionConstructor, 'Function', 1, realmRec.Intrinsics['%Function.prototype%'], []);
  realmRec.Intrinsics['%Function%'] = cons;
}
