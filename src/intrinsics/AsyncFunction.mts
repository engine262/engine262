import { surroundingAgent } from '../host-defined/engine.mts';
import { Q, X } from '../completion.mts';
import { CreateDynamicFunction } from '../runtime-semantics/all.mts';
import { Descriptor, Value } from '../value.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import type {
  Arguments, ValueEvaluator, FunctionCallContext, FunctionObject, Realm,
} from '#self';

/** https://tc39.es/ecma262/#sec-async-function-constructor-arguments */
function* AsyncFunctionConstructor(args: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject as FunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return CreateDynamicFunction(C, NewTarget, async, args).
  return Q(yield* CreateDynamicFunction(C, NewTarget, 'async', args));
}

export function bootstrapAsyncFunction(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, AsyncFunctionConstructor, 'AsyncFunction', 1, realmRec.Intrinsics['%AsyncFunction.prototype%'], []);

  X(cons.DefineOwnProperty(Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  cons.Prototype = realmRec.Intrinsics['%Function%'];

  realmRec.Intrinsics['%AsyncFunction%'] = cons;
}
