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
  New as NewValue,
  Type,
  ProxyExoticObjectValue,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function ProxyCallSlot(thisArgument, argumentsList) {
  const O = this;

  const handler = O.ProxyHandler;
  if (Type(handler) === 'Null') {
    return surroundingAgent.Throw('TypeError');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  const trap = Q(GetMethod(handler, NewValue('apply')));
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
    return surroundingAgent.Throw('TypeError');
  }
  Assert(Type(handler) === 'Object');
  const target = O.ProxyTarget;
  const trap = Q(GetMethod(handler, NewValue('construct')));
  if (Type(trap) === 'Undefined') {
    Assert(IsConstructor(target).isTrue());
    return Q(Construct(target, argumentsList, newTarget));
  }
  const argArray = CreateArrayFromList(argumentsList);
  const newObj = Q(Call(trap, handler, [target, argArray, newTarget]));
  if (Type(newObj) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  return newObj;
}

function ProxyCreate(target, handler) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a non-object as target');
  }
  if (target instanceof ProxyExoticObjectValue && Type(target.ProxyHandler) === 'Null') {
    return surroundingAgent.Throw('TypeError');
  }
  if (Type(handler) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'Cannot create proxy with a non-object as handler');
  }
  if (handler instanceof ProxyExoticObjectValue && Type(handler.ProxyHandler) === 'Null') {
    return surroundingAgent.Throw('TypeError');
  }
  const P = new ProxyExoticObjectValue();
  if (IsCallable(P).isTrue()) {
    P.Call = ProxyCallSlot;
    if (IsConstructor(target).isTrue()) {
      P.Construct = ProxyConstructSlot;
    }
  }
  P.ProxyTarget = target;
  P.ProxyHandler = handler;
  return P;
}

function ProxyConstructor([target, handler], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'costructor Proxy requires new');
  }
  return Q(ProxyCreate(target, handler));
}

function ProxyRevocationFunctions() {
  const F = this;

  const p = F.RevocableProxy;
  if (Type(p) === 'Null') {
    return NewValue(undefined);
  }
  F.RevocableProxy = NewValue(null);
  Assert(p instanceof ProxyExoticObjectValue);
  p.ProxyTarget = NewValue(null);
  p.ProxyHandler = NewValue(null);
  return NewValue(undefined);
}

function Proxy_revocable([target, handler]) {
  const p = Q(ProxyCreate(target, handler));
  const steps = ProxyRevocationFunctions;
  const revoker = CreateBuiltinFunction(steps, ['RevocableProxy']);
  SetFunctionLength(revoker, NewValue(0));
  revoker.RevocableProxy = p;
  const result = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  CreateDataProperty(result, NewValue('proxy'), p);
  CreateDataProperty(result, NewValue('revoke'), revoker);
  return result;
}

export function CreateProxy(realmRec) {
  const proxyConstructor = CreateBuiltinFunction(ProxyConstructor, [], realmRec);
  SetFunctionName(proxyConstructor, NewValue('Proxy'));
  SetFunctionLength(proxyConstructor, NewValue(2));

  {
    const fn = CreateBuiltinFunction(Proxy_revocable, [], realmRec);
    proxyConstructor.DefineOwnProperty(NewValue('revocable'), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  }

  realmRec.Intrinsics['%Proxy%'] = proxyConstructor;
}
