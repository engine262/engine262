import { surroundingAgent } from '../engine.mts';
import { Q } from '../completion.mts';
import { CreateDynamicFunction } from '../runtime-semantics/all.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import type {
  Arguments, ExpressionCompletion, FunctionCallContext, FunctionObject, Realm,
} from '#self';

/** https://tc39.es/ecma262/#sec-function-p1-p2-pn-body */
function FunctionConstructor(args: Arguments, { NewTarget }: FunctionCallContext): ExpressionCompletion {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject as FunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, normal, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'normal', args));
}

export function bootstrapFunction(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, FunctionConstructor, 'Function', 1, realmRec.Intrinsics['%Function.prototype%'], []);
  realmRec.Intrinsics['%Function%'] = cons;
}
