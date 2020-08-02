import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { Descriptor, Value } from '../value.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-asyncgeneratorfunction
function AsyncGeneratorFunctionConstructor(args, { NewTarget }) {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, asyncGenerator, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'asyncGenerator', args));
}

export function BootstrapAsyncGeneratorFunction(realmRec) {
  const cons = BootstrapConstructor(realmRec, AsyncGeneratorFunctionConstructor, 'AsyncGeneratorFunction', 1, realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'], []);

  X(cons.DefineOwnProperty(new Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X(realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'].DefineOwnProperty(new Value('constructor'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  cons.Prototype = realmRec.Intrinsics['%Function%'];

  realmRec.Intrinsics['%AsyncGeneratorFunction%'] = cons;
}
