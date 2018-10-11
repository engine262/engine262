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
  Value,
  Type,
  ProxyExoticObjectValue,
  Descriptor,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function ProxyCallSlot(thisArgument, argumentsList) {
  const O = this;

  const handler = O.ProxyHandler;
  if (Type(handler) === 'Null') {
    return surroundingAgent.Throw('TypeError', 'Cannot call a proxy that has been revoked');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  const trap = Q(GetMethod(handler, new Value('apply')));
  if (Type(trap) === 'Undefined') {
    return Q(Call(target, thisArgument, argumentsList));
  }
  const argArray = CreateArrayFromList(argumentsList);
  return Q(Call(trap, handler, [target, thisArgument, argArray]));
}

function ProxyConstructSlot(argumentsList, newTarget) {
  const O = this;

  const handler = O.ProxyHandler;
  if (Type(handler) === 'Null') {
    return surroundingAgent.Throw('TypeError', 'Cannot construct a proxy that has been revoked');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  const trap = Q(GetMethod(handler, new Value('construct')));
  if (Type(trap) === 'Undefined') {
    Assert(IsConstructor(target) === Value.true);
    return Q(Construct(target, argumentsList, newTarget));
  }
  const argArray = CreateArrayFromList(argumentsList);
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
  if (IsCallable(P) === Value.true) {
    P.Call = ProxyCallSlot;
    if (IsConstructor(target) === Value.true) {
      P.Construct = ProxyConstructSlot;
    }
  }
  P.ProxyTarget = target;
  P.ProxyHandler = handler;
  return P;
}

function ProxyConstructor([target, handler], { NewTarget }) {
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

function Proxy_revocable([target, handler]) {
  const p = Q(ProxyCreate(target, handler));
  const steps = ProxyRevocationFunctions;
  const revoker = CreateBuiltinFunction(steps, ['RevocableProxy']);
  SetFunctionLength(revoker, new Value(0));
  revoker.RevocableProxy = p;
  const result = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  CreateDataProperty(result, new Value('proxy'), p);
  CreateDataProperty(result, new Value('revoke'), revoker);
  return result;
}

export function CreateProxy(realmRec) {
  const proxyConstructor = CreateBuiltinFunction(ProxyConstructor, [], realmRec);
  SetFunctionName(proxyConstructor, new Value('Proxy'));
  SetFunctionLength(proxyConstructor, new Value(2));

  {
    const fn = CreateBuiltinFunction(Proxy_revocable, [], realmRec);
    proxyConstructor.DefineOwnProperty(new Value('revocable'), Descriptor({
      Value: fn,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  }

  realmRec.Intrinsics['%Proxy%'] = proxyConstructor;
}
