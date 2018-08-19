import {
  surroundingAgent,
} from '../engine.mjs';
import {
  CreateBuiltinFunction,
  IsCallable,
  Call,
  CreateListFromArrayLike,
  HasOwnProperty,
  Get,
  ToInteger,
  SetFunctionName,
  SetFunctionLength,
  IsConstructor,
  Assert,
  SameValue,
  Construct,
  OrdinaryHasInstance,
  PrepareForTailCall,
} from '../abstract-ops/all.mjs';
import {
  Type,
  ObjectValue,
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';

function FunctionProto_apply(realm, [thisArg, argArray], { thisValue: func }) {
  if (IsCallable(func).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  if (Type(argArray) === 'Undefined' || Type(argArray) === 'Null') {
    PrepareForTailCall();
    return Q(Call(func, thisArg));
  }
  const argList = CreateListFromArrayLike(argArray);
  PrepareForTailCall();
  return Q(Call(func, thisArg, argList));
}

function BoundFunctionExoticObjectCall(thisArgument, argumentsList) {
  const F = this;

  const target = F.BoundTargetFunction;
  const boundThis = F.BoundThis;
  const boundArgs = F.BoundArguments;
  const args = [...boundArgs, ...argumentsList];
  return Q(Call(target, boundThis, args));
}

function BoundFunctionExoticObjectConstruct(argumentsList, newTarget) {
  const F = this;

  const target = F.BoundTargetFunction;
  Assert(IsConstructor(target).isTrue());
  const boundArgs = F.BoundArguments;
  const args = [...boundArgs, ...argumentsList];
  if (SameValue(F, newTarget)) {
    newTarget = target;
  }
  return Q(Construct(target, args, newTarget));
}

// #sec-boundfunctioncreate
function BoundFunctionCreate(targetFunction, boundThis, boundArgs) {
  Assert(Type(targetFunction) === 'Object');
  const proto = Q(targetFunction.GetPrototypeOf());
  const obj = new ObjectValue();
  obj.Call = BoundFunctionExoticObjectCall;
  if (IsConstructor(targetFunction).isTrue()) {
    obj.Construct = BoundFunctionExoticObjectConstruct;
  }
  obj.Prototype = proto;
  obj.Extensible = true;
  obj.BoundTargetFunction = targetFunction;
  obj.BoundThis = boundThis;
  obj.BoundArguments = boundArgs;
  return obj;
}

function FunctionProto_bind(realm, [thisArg, ...args], { thisValue }) {
  const Target = thisValue;
  if (IsCallable(Target).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  // Let args be a new (possibly empty) List consisting of all
  // of the argument values provided after thisArg in order.
  const F = Q(BoundFunctionCreate(Target, thisArg, args));
  const targetHasLength = Q(HasOwnProperty(Target, NewValue('length')));
  let L;
  if (targetHasLength.isTrue()) {
    let targetLen = Q(Get(Target, NewValue('length')));
    if (Type(targetLen) !== 'Number') {
      L = 0;
    } else {
      targetLen = ToInteger(targetLen);
      L = Math.max(0, targetLen - args.length);
    }
  } else {
    L = 0;
  }
  X(SetFunctionLength(F, L));
  let targetName = Q(Get(Target, NewValue('name')));
  if (Type(targetName) !== 'String') {
    targetName = NewValue('');
  }
  SetFunctionName(F, targetName, NewValue('bound'));
  return F;
}

function FunctionProto_toString() {
  return surroundingAgent.Throw('TypeError');
}

function FunctionProto_hasInstance(realm, [V], { thisValue }) {
  const F = thisValue;
  return Q(OrdinaryHasInstance(F, V));
}

export function CreateFunctionPrototype(realmRec) {
  const proto = CreateBuiltinFunction(() => NewValue(undefined), [], realmRec);
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];

  [
    ['apply', FunctionProto_apply, 2],
    ['bind', FunctionProto_bind, 1],
    ['toString', FunctionProto_toString, 0],
    [wellKnownSymbols.hasInstance, FunctionProto_hasInstance, 1],
  ].forEach(([name, fn, length]) => {
    if (typeof name === 'string') {
      name = NewValue(name);
    }
    const n = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(n, name);
    SetFunctionLength(n, NewValue(length));
    proto.DefineOwnProperty(name, {
      Value: n,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%FunctionPrototype%'] = proto;
}
