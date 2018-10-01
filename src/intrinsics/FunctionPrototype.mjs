import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  Call,
  Construct,
  CreateBuiltinFunction,
  CreateListFromArrayLike,
  Get,
  HasOwnProperty,
  IsCallable,
  IsConstructor,
  OrdinaryHasInstance,
  PrepareForTailCall,
  SameValue,
  SetFunctionLength,
  SetFunctionName,
  ToInteger,
} from '../abstract-ops/all.mjs';
import {
  Value,
  ObjectValue,
  Type,
  wellKnownSymbols,
  Descriptor,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';

function FunctionProto_apply([thisArg, argArray], { thisValue: func }) {
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

function FunctionProto_bind([thisArg, ...args], { thisValue }) {
  const Target = thisValue;
  if (IsCallable(Target).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  // Let args be a new (possibly empty) List consisting of all
  // of the argument values provided after thisArg in order.
  const F = Q(BoundFunctionCreate(Target, thisArg, args));
  const targetHasLength = Q(HasOwnProperty(Target, new Value('length')));
  let L;
  if (targetHasLength.isTrue()) {
    let targetLen = Q(Get(Target, new Value('length')));
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
  let targetName = Q(Get(Target, new Value('name')));
  if (Type(targetName) !== 'String') {
    targetName = new Value('');
  }
  SetFunctionName(F, targetName, new Value('bound'));
  return F;
}

function FunctionProto_call([thisArg, ...args], { thisValue: func }) {
  if (IsCallable(func).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  const argList = [];
  for (const arg of args) {
    argList.push(arg);
  }
  PrepareForTailCall();
  return Q(Call(func, thisArg, argList));
}

function FunctionProto_toString(args, { thisValue: func }) {
  if ('BoundTargetFunction' in func || 'nativeFunction' in func) {
    const name = func.properties.get(new Value('name'));
    if (name !== undefined) {
      return new Value(`function ${name.Value.stringValue()} { [native code] }`);
    }
    return new Value('function() { [native code] }');
  }
  if ('ECMAScriptCode' in func) {
    const scriptCtx = [...surroundingAgent.executionContextStack]
      .reverse()
      .find((c) => c.HostDefined !== undefined && c.HostDefined.sourceText !== undefined);
    Assert(scriptCtx !== undefined);
    const { sourceText } = scriptCtx.HostDefined;
    return new Value(sourceText.slice(func.ECMAScriptCode.start, func.ECMAScriptCode.end));
  }
  return surroundingAgent.Throw('TypeError');
}

function FunctionProto_hasInstance([V], { thisValue }) {
  const F = thisValue;
  return Q(OrdinaryHasInstance(F, V));
}

export function CreateFunctionPrototype(realmRec) {
  Assert(realmRec.Intrinsics['%FunctionPrototype%']);
  const proto = realmRec.Intrinsics['%FunctionPrototype%'];
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];

  [
    ['apply', FunctionProto_apply, 2],
    ['bind', FunctionProto_bind, 1],
    ['call', FunctionProto_call, 1],
    ['toString', FunctionProto_toString, 0],
    [wellKnownSymbols.hasInstance, FunctionProto_hasInstance, 1],
  ].forEach(([name, fn, length]) => {
    if (typeof name === 'string') {
      name = new Value(name);
    }
    const n = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(n, name);
    SetFunctionLength(n, new Value(length));
    proto.DefineOwnProperty(name, Descriptor({
      Value: n,
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(true),
    }));
  });
}
