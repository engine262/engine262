import {
  Descriptor,
  UndefinedValue,
  Value,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  Assert,
  MakeRealm,
  isOrdinaryObject,
  OrdinaryCreateFromConstructor,
  Realm,
  type FunctionObject,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import { type Mutable } from '#self';

export interface ShadowRealmObject extends OrdinaryObject {
  readonly ShadowRealm: Realm;
}

export function isShadowRealmObject(value: Value): value is ShadowRealmObject {
  return 'ShadowRealm' in value;
}

/** https://tc39.es/ecma262/#sec-symbol-description */
function* ShadowRealmConstructor(this: FunctionObject, _args: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  Q(surroundingAgent.debugger_cannotPreview);
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%ShadowRealm.prototype%', ['ShadowRealm'])) as Mutable<ShadowRealmObject>;
  // Note: wait for https://github.com/tc39/ecma262/pull/3728
  const realm = Q(MakeRealm({
    name: 'ShadowRealm',
    specifier: surroundingAgent.currentRealmRecord.HostDefined.specifier,
  }));
  const innerContext = realm.topContext;

  const realmRec = innerContext.Realm;
  O.ShadowRealm = realmRec;

  const hostHookCompletion = surroundingAgent.hostDefinedOptions.hostHooks?.HostInitializeShadowRealm?.(realmRec, innerContext, O);
  if (typeof hostHookCompletion === 'object' && hostHookCompletion && 'next' in hostHookCompletion) {
    Q(yield* hostHookCompletion);
  } else {
    Q(hostHookCompletion);
  }

  Assert(isOrdinaryObject(realmRec.GlobalObject));
  return O;
}

export function bootstrapShadowRealm(realmRec: Realm) {
  const shadowRealmConstructor = bootstrapConstructor(realmRec, ShadowRealmConstructor, 'ShadowRealm', 0, realmRec.Intrinsics['%ShadowRealm.prototype%'], [
  ]);

  X(shadowRealmConstructor.DefineOwnProperty(Value('prototype'), Descriptor({
    Value: realmRec.Intrinsics['%ShadowRealm.prototype%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%ShadowRealm%'] = shadowRealmConstructor;
}
