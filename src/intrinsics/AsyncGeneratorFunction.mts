import { surroundingAgent } from '../engine.mts';
import { Q, X } from '../completion.mts';
import { CreateDynamicFunction } from '../runtime-semantics/all.mts';
import { Descriptor, Value } from '../value.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import type {
  Arguments, ExpressionCompletion, FunctionCallContext, FunctionObject, Realm,
} from '#self';

/** https://tc39.es/ecma262/#sec-asyncgeneratorfunction */
function AsyncGeneratorFunctionConstructor(args: Arguments, { NewTarget }: FunctionCallContext): ExpressionCompletion {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject as FunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, asyncGenerator, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'asyncGenerator', args));
}

export function bootstrapAsyncGeneratorFunction(realmRec: Realm) {
  const cons = bootstrapConstructor(realmRec, AsyncGeneratorFunctionConstructor, 'AsyncGeneratorFunction', 1, realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'], []);

  X(cons.DefineOwnProperty(Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  X((realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%']).DefineOwnProperty(Value('constructor'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  cons.Prototype = realmRec.Intrinsics['%Function%'];

  realmRec.Intrinsics['%AsyncGeneratorFunction%'] = cons;
}
