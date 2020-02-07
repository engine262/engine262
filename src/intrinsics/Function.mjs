import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function FunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'normal', args));
}

export function BootstrapFunction(realmRec) {
  const cons = BootstrapConstructor(realmRec, FunctionConstructor, 'Function', 1, realmRec.Intrinsics['%Function.prototype%'], []);
  realmRec.Intrinsics['%Function%'] = cons;
}
