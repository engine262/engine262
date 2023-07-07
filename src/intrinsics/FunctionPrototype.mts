// @ts-nocheck
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
  ToIntegerOrInfinity,
  CreateBuiltinFunction,
  MakeBasicObject,
} from '../abstract-ops/all.mjs';
import {
  JSStringValue,
  NumberValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-properties-of-the-function-prototype-object */
function FunctionProto(_args, _meta) {
  // * accepts any arguments and returns undefined when invoked.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-function.prototype.apply */
function FunctionProto_apply([thisArg = Value.undefined, argArray = Value.undefined], { thisValue }) {
  // 1. Let func be the this value.
  const func = thisValue;
  // 2. If IsCallable(func) is false, throw a TypeError exception.
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'ThisNotAFunction', func);
  }
  // 3. If argArray is undefined or null, then
  if (argArray === Value.undefined || argArray === Value.null) {
    // a. Perform PrepareForTailCall().
    PrepareForTailCall();
    // b. Return ? Call(func, thisArg).
    return Q(Call(func, thisArg));
  }
  // 4. Let argList be ? CreateListFromArrayLike(argArray).
  const argList = Q(CreateListFromArrayLike(argArray));
  // 5. Perform PrepareForTailCall().
  PrepareForTailCall();
  // 6. Return ? Call(func, thisArg, argList).
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

/** https://tc39.es/ecma262/#sec-boundfunctioncreate */
function BoundFunctionCreate(targetFunction, boundThis, boundArgs) {
  // 1. Assert: Type(targetFunction) is Object.
  Assert(targetFunction instanceof ObjectValue);
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

/** https://tc39.es/ecma262/#sec-function.prototype.bind */
function FunctionProto_bind([thisArg = Value.undefined, ...args], { thisValue }) {
  // 1. Let Target be the this value.
  const Target = thisValue;
  // 2. If IsCallable(Target) is false, throw a TypeError exception.
  if (IsCallable(Target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'ThisNotAFunction', Target);
  }
  // 3. Let F be ? BoundFunctionCreate(Target, thisArg, args).
  const F = Q(BoundFunctionCreate(Target, thisArg, args));
  // 4. Let L be 0.
  let L = 0;
  // 5. Let targetHasLength be ? HasOwnProperty(Target, "length").
  const targetHasLength = Q(HasOwnProperty(Target, Value('length')));
  // 6. If targetHasLength is true, then
  if (targetHasLength === Value.true) {
    // a. Let targetLen be ? Get(Target, "length").
    const targetLen = Q(Get(Target, Value('length')));
    // b. If Type(targetLen) is Number, then
    if (targetLen instanceof NumberValue) {
      // i. If targetLen is +∞𝔽, set L to +∞.
      if (targetLen.numberValue() === +Infinity) {
        L = +Infinity;
      } else if (targetLen.numberValue() === -Infinity) { // ii. Else if targetLen is -∞𝔽, set L to 0.
        L = 0;
      } else { // iii. Else,
        // 1. Set targetLen to ! ToIntegerOrInfinity(targetLen).
        const targetLenAsInt = Q(ToIntegerOrInfinity(targetLen));
        // 2. Assert: targetLenAsInt is finite.
        Assert(Number.isFinite(targetLenAsInt));
        // 3. Let argCount be the number of elements in args.
        const argCount = args.length;
        // 4. Set L to max(targetLenAsInt - argCount, 0).
        L = Math.max(targetLenAsInt - argCount, 0);
      }
    }
  }
  // 7. Perform ! SetFunctionLength(F, L).
  X(SetFunctionLength(F, L));
  // 8. Let targetName be ? Get(Target, "name").
  let targetName = Q(Get(Target, Value('name')));
  // 9. If Type(targetName) is not String, set targetName to the empty String.
  if (!(targetName instanceof JSStringValue)) {
    targetName = Value('');
  }
  // 10. Perform SetFunctionName(F, targetName, "bound").
  SetFunctionName(F, targetName, Value('bound'));
  // 11. Return F.
  return F;
}

/** https://tc39.es/ecma262/#sec-function.prototype.call */
function FunctionProto_call([thisArg = Value.undefined, ...args], { thisValue }) {
  // 1. Let func be the this value.
  const func = thisValue;
  // 2. If IsCallable(func) is false, throw a TypeError exception.
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'ThisNotAFunction', func);
  }
  // 3. Let argList be a new empty List.
  const argList = [];
  // 4. If this method was called with more than one argument, then in left to right order, starting with the second argument, append each argument as the last element of argList.
  for (const arg of args) {
    argList.push(arg);
  }
  // 5. Perform PrepareForTailCall().
  PrepareForTailCall();
  // 6. Return ? Call(func, thisArg, argList).
  return Q(Call(func, thisArg, argList));
}

/** https://tc39.es/ecma262/#sec-function.prototype.tostring */
function FunctionProto_toString(args, { thisValue }) {
  // 1. Let func be the this value.
  const func = thisValue;
  // 2. If Type(func) is Object and func has a [[SourceText]] internal slot and func.[[SourceText]]
  //    is a sequence of Unicode code points and ! HostHasSourceTextAvailable(func) is true, then
  if (func instanceof ObjectValue
      && 'SourceText' in func
      && X(HostHasSourceTextAvailable(func)) === Value.true) {
    // Return ! UTF16Encode(func.[[SourceText]]).
    return Value(func.SourceText);
  }
  // 3. If func is a built-in function object, then return an implementation-defined
  //    String source code representation of func. The representation must have the
  //    syntax of a NativeFunction. Additionally, if func has an [[InitialName]] internal
  //    slot and func.[[InitialName]] is a String, the portion of the returned String
  //    that would be matched by `NativeFunctionAccessor? PropertyName` must be the
  //    value of func.[[InitialName]].
  if ('nativeFunction' in func) {
    if (func.InitialName !== Value.null) {
      return Value(`function ${func.InitialName.stringValue()}() { [native code] }`);
    }
    return Value('function() { [native code] }');
  }
  // 4. If Type(func) is Object and IsCallable(func) is true, then return an implementation
  //    dependent String source code representation of func. The representation must have
  //    the syntax of a NativeFunction.
  if (func instanceof ObjectValue && IsCallable(func) === Value.true) {
    return Value('function() { [native code] }');
  }
  // 5. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
}

/** https://tc39.es/ecma262/#sec-function.prototype-@@hasinstance */
function FunctionProto_hasInstance([V = Value.undefined], { thisValue }) {
  // 1. Let F be this value.
  const F = thisValue;
  // 2. Return ? OrdinaryHasInstance(F, V).
  return Q(OrdinaryHasInstance(F, V));
}

export function bootstrapFunctionPrototype(realmRec) {
  const proto = CreateBuiltinFunction(
    FunctionProto,
    0,
    Value(''),
    [],
    realmRec,
    realmRec.Intrinsics['%Object.prototype%'],
  );
  realmRec.Intrinsics['%Function.prototype%'] = proto;

  const readonly = { Writable: Value.false, Configurable: Value.false };
  assignProps(realmRec, proto, [
    ['apply', FunctionProto_apply, 2],
    ['bind', FunctionProto_bind, 1],
    ['call', FunctionProto_call, 1],
    ['toString', FunctionProto_toString, 0],
    [wellKnownSymbols.hasInstance, FunctionProto_hasInstance, 1, readonly],
  ]);
}
