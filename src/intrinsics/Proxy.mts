import {
  NullValue, ObjectValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { Q, X, type ValueCompletion } from '../completion.mts';
import { assignProps } from './bootstrap.mts';
import {
  CreateDataPropertyOrThrow,
  intrinsics,
  surroundingAgent,
} from '#self';
import {
  Assert,
  CreateBuiltinFunction,
  markBuiltinFunctionAsConstructor,
  OrdinaryObjectCreate,
  ProxyCreate,
  Realm,
  Throw,
  type BuiltinFunctionObject,
  type ExoticObject,
  type FunctionObject,
} from '#self';

export interface ProxyObject extends ExoticObject, BuiltinFunctionObject {
  ProxyHandler: Value | NullValue;
  ProxyTarget: ObjectValue | NullValue;
}
export function isProxyExoticObject(O: Value): O is ProxyObject {
  return 'ProxyHandler' in O;
}
export interface RevocableProxyRevokeFunctionObject extends BuiltinFunctionObject {
  RevocableProxy: ProxyObject | NullValue;
}
/** https://tc39.es/ecma262/#sec-proxy-target-handler */
function ProxyConstructor(this: FunctionObject, [target = Value.undefined, handler = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. f NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return Throw.TypeError('Proxy cannot be invoked without new');
  }
  // 2. Return ? ProxyCreate(target, handler).
  return ProxyCreate(target, handler);
}

/** https://tc39.es/ecma262/#sec-proxy.revocable */
function Proxy_revocable([target = Value.undefined, handler = Value.undefined]: Arguments): ValueCompletion {
  const proxy = Q(ProxyCreate(target, handler));
  const revokerClosure = function revokerClosure() {
    const activeFunc = surroundingAgent.activeFunctionObject as RevocableProxyRevokeFunctionObject;
    const revocableProxy = activeFunc.RevocableProxy;
    if (revocableProxy === Value.null) return Value.undefined;
    activeFunc.RevocableProxy = Value.null;
    Assert(isProxyExoticObject(revocableProxy));
    revocableProxy.ProxyTarget = Value.null;
    revocableProxy.ProxyHandler = Value.null;
    return Value.undefined;
  }
  const revoker = CreateBuiltinFunction(revokerClosure, 0, '', ['RevocableProxy']) as RevocableProxyRevokeFunctionObject;
  revoker.RevocableProxy = proxy;
  const result = OrdinaryObjectCreate(intrinsics()['%Object.prototype%']);
  X(CreateDataPropertyOrThrow(result, 'proxy', proxy));
  X(CreateDataPropertyOrThrow(result, 'revoke', revoker));
  return result;
}

export function bootstrapProxy(realm: Realm) {
  const proxyConstructor = CreateBuiltinFunction(
    markBuiltinFunctionAsConstructor(ProxyConstructor), 2, 'Proxy', [], { captures: null, realm },
  );

  assignProps(realm, proxyConstructor, [
    ['revocable', Proxy_revocable, 2],
  ]);

  realm.Intrinsics['%Proxy%'] = proxyConstructor;
}
