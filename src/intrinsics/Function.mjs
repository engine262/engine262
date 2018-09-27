import { surroundingAgent } from '../engine.mjs';
import { New as NewValue } from '../value.mjs';
import { CreateBuiltinFunction } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// #sec-createdynamicfunction
function CreateDynamicFunction() {
  return surroundingAgent.Throw('TypeError', 'CreateDynamicFunction');
}

function FunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'normal', args));
}

export function CreateFunction(realmRec) {
  const cons = CreateBuiltinFunction(FunctionConstructor, [], realmRec);
  const proto = realmRec.Intrinsics['%FunctionPrototype%'];

  cons.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: cons,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%Function%'] = cons;
}
