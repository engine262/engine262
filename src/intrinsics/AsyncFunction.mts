// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { Descriptor, Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-async-function-constructor-arguments */
function AsyncFunctionConstructor(args, { NewTarget }) {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return CreateDynamicFunction(C, NewTarget, async, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'async', args));
}

export function bootstrapAsyncFunction(realmRec) {
  const cons = bootstrapConstructor(realmRec, AsyncFunctionConstructor, 'AsyncFunction', 1, realmRec.Intrinsics['%AsyncFunction.prototype%'], []);

  cons.DefineOwnProperty(new Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  cons.Prototype = realmRec.Intrinsics['%Function%'];

  realmRec.Intrinsics['%AsyncFunction%'] = cons;
}
