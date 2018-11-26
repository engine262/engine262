import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { Descriptor, Value } from '../value.mjs';

function AsyncGeneratorFunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'async generator', args));
}

export function CreateAsyncGeneratorFunction(realmRec) {
  const cons = BootstrapConstructor(realmRec, AsyncGeneratorFunctionConstructor, 'AsyncGeneratorFunction', 1, realmRec.Intrinsics['%AsyncGenerator%'], []);

  X(cons.DefineOwnProperty(new Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X(realmRec.Intrinsics['%AsyncGenerator%'].DefineOwnProperty(new Value('constructor'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  cons.Prototype = realmRec.Intrinsics['%Function%'];

  realmRec.Intrinsics['%AsyncGeneratorFunction%'] = cons;
}
