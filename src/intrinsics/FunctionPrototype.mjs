import {
  surroundingAgent,
  HostHasSourceTextAvailable,
} from '../engine.mjs';
import {
  Assert,
  Call,
  Construct,
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
  CreateBuiltinFunction,
  MakeBasicObject,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './Bootstrap.mjs';

function FunctionProto_apply([thisArg = Value.undefined, argArray = Value.undefined], { thisValue: func }) {
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  if (Type(argArray) === 'Undefined' || Type(argArray) === 'Null') {
    PrepareForTailCall();
    return Q(Call(func, thisArg));
  }
  const argList = Q(CreateListFromArrayLike(argArray));
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
  Assert(IsConstructor(target) === Value.true);
  const boundArgs = F.BoundArguments;
  const args = [...boundArgs, ...argumentsList];
  if (SameValue(F, newTarget) === Value.true) {
    newTarget = target;
  }
  return Q(Construct(target, args, newTarget));
}

// 9.4.1.3 #sec-boundfunctioncreate
function BoundFunctionCreate(targetFunction, boundThis, boundArgs) {
  // 1. Assert: Type(targetFunction) is Object.
  Assert(Type(targetFunction) === 'Object');
  // 2. Let proto be ? targetFunction.[[GetPrototypeOf]]().
  const proto = Q(targetFunction.GetPrototypeOf());
  // 3. Let internalSlotsList be the internal slots listed in Table 30, plus [[Prototype]] and [[Extensible]].
  const internalSlotsList = [
    'BoundTargetFunction',
    'BoundThis',
    'BoundArguments',
    'Prototype',
    'Extensible',
  ];
  // 4. Let obj be ! MakeBasicObject(internalSlotsList).
  const obj = X(MakeBasicObject(internalSlotsList));
  // 5. Set obj.[[Prototype]] to proto.
  obj.Prototype = proto;
  // 6. Set obj.[[Call]] as described in 9.4.1.1.
  obj.Call = BoundFunctionExoticObjectCall;
  // 7. If IsConstructor(targetFunction) is true, then
  if (IsConstructor(targetFunction) === Value.true) {
    // a. Set obj.[[Construct]] as described in 9.4.1.2.
    obj.Construct = BoundFunctionExoticObjectConstruct;
  }
  // 8. Set obj.[[BoundTargetFunction]] to targetFunction.
  obj.BoundTargetFunction = targetFunction;
  // 9. Set obj.[[BoundThis]] to boundThis.
  obj.BoundThis = boundThis;
  // 10. Set obj.[[BoundArguments]] to boundArguments.
  obj.BoundArguments = boundArgs;
  // 11. Return obj.
  return obj;
}

function FunctionProto_bind([thisArg = Value.undefined, ...args], { thisValue }) {
  const Target = thisValue;
  if (IsCallable(Target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', Target);
  }
  // Let args be a new (possibly empty) List consisting of all
  // of the argument values provided after thisArg in order.
  const F = Q(BoundFunctionCreate(Target, thisArg, args));
  const targetHasLength = Q(HasOwnProperty(Target, new Value('length')));
  let L;
  if (targetHasLength === Value.true) {
    let targetLen = Q(Get(Target, new Value('length')));
    if (Type(targetLen) !== 'Number') {
      L = 0;
    } else {
      targetLen = Q(ToInteger(targetLen)).numberValue();
      L = Math.max(0, targetLen - args.length);
    }
  } else {
    L = 0;
  }
  X(SetFunctionLength(F, new Value(L)));
  let targetName = Q(Get(Target, new Value('name')));
  if (Type(targetName) !== 'String') {
    targetName = new Value('');
  }
  SetFunctionName(F, targetName, new Value('bound'));
  return F;
}

function FunctionProto_call([thisArg = Value.undefined, ...args], { thisValue: func }) {
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  const argList = [];
  for (const arg of args) {
    argList.push(arg);
  }
  PrepareForTailCall();
  return Q(Call(func, thisArg, argList));
}

// #sec-function.prototype.tostring
function FunctionProto_toString(args, { thisValue: func }) {
  // 1. Let func be the this value.
  // 2. If func is a bound function exotic object or a built-in function object, then
  //    return an implementation-dependent String source code representation of func.
  //    The representation must have the syntax of a NativeFunction. Additionally, if
  //    func is a Well-known Intrinsic Object and is not identified as an anonymous
  //    function, the portion of the returned String that would be matched by
  //    PropertyName must be the initial value of the "name" property of func.
  if ('BoundTargetFunction' in func || 'nativeFunction' in func) {
    const name = func.properties.get(new Value('name'));
    if (name !== undefined) {
      return new Value(`function ${name.Value.stringValue()}() { [native code] }`);
    }
    return new Value('function() { [native code] }');
  }
  // 3. If Type(func) is Object and func has a [[SourceText]] internal slot and func.[[SourceText]]
  //    is a sequence of Unicode code points and ! HostHasSourceTextAvailable(func) is true, then
  if (Type(func) === 'Object'
      && 'SourceText' in func
      && X(HostHasSourceTextAvailable(func)) === Value.true) {
    // Return ! UTF16Encode(func.[[SourceText]]).
    return new Value(func.SourceText);
  }
  // 4. If Type(func) is Object and IsCallable(func) is true, then return an implementation
  //    dependent String source code representation of func. The representation must have
  //    the syntax of a NativeFunction.
  if (Type(func) === 'Object' && IsCallable(func) === Value.true) {
    return new Value('function() { [native code] }');
  }
  // 5. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
}

function FunctionProto_hasInstance([V = Value.undefined], { thisValue }) {
  const F = thisValue;
  return Q(OrdinaryHasInstance(F, V));
}

export function BootstrapFunctionPrototype(realmRec) {
  const proto = CreateBuiltinFunction(() => Value.undefined, [], realmRec, realmRec.Intrinsics['%Object.prototype%']);
  realmRec.Intrinsics['%Function.prototype%'] = proto;

  SetFunctionLength(proto, new Value(0));
  SetFunctionName(proto, new Value(''));

  const readonly = { Writable: Value.false, Configurable: Value.false };
  assignProps(realmRec, proto, [
    ['apply', FunctionProto_apply, 2],
    ['bind', FunctionProto_bind, 1],
    ['call', FunctionProto_call, 1],
    ['toString', FunctionProto_toString, 0],
    [wellKnownSymbols.hasInstance, FunctionProto_hasInstance, 1, readonly],
  ]);
}
