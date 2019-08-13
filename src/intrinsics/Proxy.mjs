import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  Call,
  Construct,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateDataProperty,
  GetMethod,
  IsCallable,
  IsConstructor,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  ProxyExoticObjectValue,
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './Bootstrap.mjs';

function ProxyCallSlot(thisArgument, argumentsList) {
  const O = this;

  const handler = O.ProxyHandler;
  if (handler === Value.null) {
    return surroundingAgent.Throw('TypeError', 'Cannot call a proxy that has been revoked');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  const trap = Q(GetMethod(handler, new Value('apply')));
  if (trap === Value.undefined) {
    return Q(Call(target, thisArgument, argumentsList));
  }
  const argArray = X(CreateArrayFromList(argumentsList));
  return Q(Call(trap, handler, [target, thisArgument, argArray]));
}

function ProxyConstructSlot(argumentsList, newTarget) {
  const O = this;

  const handler = O.ProxyHandler;
  if (handler === Value.null) {
    return surroundingAgent.Throw('TypeError', 'Cannot construct a proxy that has been revoked');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  Assert(IsConstructor(target) === Value.true);
  const trap = Q(GetMethod(handler, new Value('construct')));
  if (trap === Value.undefined) {
    return Q(Construct(target, argumentsList, newTarget));
  }
  const argArray = X(CreateArrayFromList(argumentsList));
  const newObj = Q(Call(trap, handler, [target, argArray, newTarget]));
  if (Type(newObj) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Proxy trap returned non-object');
  }
  return newObj;
}

function ProxyCreate(target, handler) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a non-object as target');
  }
  if (target instanceof ProxyExoticObjectValue && Type(target.ProxyHandler) === 'Null') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a revoked proxy as target');
  }
  if (Type(handler) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a non-object as handler');
  }
  if (handler instanceof ProxyExoticObjectValue && Type(handler.ProxyHandler) === 'Null') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a revoked proxy as handler');
  }
  const P = new ProxyExoticObjectValue();
  if (IsCallable(target) === Value.true) {
    P.Call = ProxyCallSlot;
    if (IsConstructor(target) === Value.true) {
      P.Construct = ProxyConstructSlot;
    }
  }
  P.ProxyTarget = target;
  P.ProxyHandler = handler;
  return P;
}

function ProxyConstructor([target = Value.undefined, handler = Value.undefined], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'Constructor Proxy requires \'new\'');
  }
  return Q(ProxyCreate(target, handler));
}

function ProxyRevocationFunctions() {
  const F = this;

  const p = F.RevocableProxy;
  if (Type(p) === 'Null') {
    return Value.undefined;
  }
  F.RevocableProxy = Value.null;
  Assert(p instanceof ProxyExoticObjectValue);
  p.ProxyTarget = Value.null;
  p.ProxyHandler = Value.null;
  return Value.undefined;
}

function Proxy_revocable([target = Value.undefined, handler = Value.undefined]) {
  const p = Q(ProxyCreate(target, handler));
  const steps = ProxyRevocationFunctions;
  const revoker = X(CreateBuiltinFunction(steps, ['RevocableProxy']));
  SetFunctionLength(revoker, new Value(0));
  revoker.RevocableProxy = p;
  const result = ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataProperty(result, new Value('proxy'), p));
  X(CreateDataProperty(result, new Value('revoke'), revoker));
  return result;
}

export function CreateProxy(realmRec) {
  const proxyConstructor = CreateBuiltinFunction(ProxyConstructor, [], realmRec, undefined, Value.true);
  SetFunctionName(proxyConstructor, new Value('Proxy'));
  SetFunctionLength(proxyConstructor, new Value(2));

  assignProps(realmRec, proxyConstructor, [
    ['revocable', Proxy_revocable, 2],
  ]);

  realmRec.Intrinsics['%Proxy%'] = proxyConstructor;
}
