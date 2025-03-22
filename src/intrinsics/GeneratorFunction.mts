import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Descriptor, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { DefinePropertyOrThrow, Realm, type FunctionObject } from '../abstract-ops/all.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { CreateDynamicFunction } from '../runtime-semantics/all.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-generatorfunction */
function* GeneratorFunctionConstructor(args: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject as FunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, generator, args).
  return Q(yield* CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function bootstrapGeneratorFunction(realmRec: Realm) {
  const generator = realmRec.Intrinsics['%GeneratorFunction.prototype%'];

  const cons = bootstrapConstructor(realmRec, GeneratorFunctionConstructor, 'GeneratorFunction', 1, generator, []);
  X(DefinePropertyOrThrow(cons, Value('prototype'), Descriptor({
    Writable: Value.false,
    Configurable: Value.false,
  })));
  X(DefinePropertyOrThrow(generator, Value('constructor'), Descriptor({
    Writable: Value.false,
  })));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
}
