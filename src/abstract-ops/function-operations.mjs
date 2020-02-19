import {
  surroundingAgent,
  ExecutionContext,
} from '../engine.mjs';
import { Realm } from '../realm.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import {
  EnsureCompletion,
  NormalCompletion,
  ReturnIfAbrupt,
  Q, X,
} from '../completion.mjs';
import { ExpectedArgumentCount } from '../static-semantics/all.mjs';
import { EvaluateBody } from '../runtime-semantics/all.mjs';
import {
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  NewFunctionEnvironment,
} from '../environment.mjs';
import { unwind } from '../helpers.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  GetActiveScriptOrModule,
  HasOwnProperty,
  IsConstructor,
  IsExtensible,
  IsInteger,
  MakeBasicObject,
  OrdinaryObjectCreate,
  OrdinaryCreateFromConstructor,
  ToObject,
  isStrictModeCode,
} from './all.mjs';

// This file covers abstract operations defined in
// 9.2 #sec-ecmascript-function-objects
// 9.3 #sec-built-in-function-objects
// and
// 14.9 #sec-tail-position-calls

export function isECMAScriptFunctionObject(O) {
  return 'ECMAScriptCode' in O;
}

export function isFunctionObject(O) {
  return 'Call' in O;
}

// 9.2.1.1 #sec-prepareforordinarycall
function PrepareForOrdinaryCall(F, newTarget) {
  Assert(Type(newTarget) === 'Undefined' || Type(newTarget) === 'Object');
  // const callerContext = surroundingAgent.runningExecutionContext;
  const calleeContext = new ExecutionContext();
  calleeContext.Function = F;
  const calleeRealm = F.Realm;
  calleeContext.Realm = calleeRealm;
  calleeContext.ScriptOrModule = F.ScriptOrModule;
  const localEnv = NewFunctionEnvironment(F, newTarget);
  calleeContext.LexicalEnvironment = localEnv;
  calleeContext.VariableEnvironment = localEnv;
  // Suspend(callerContext);
  surroundingAgent.executionContextStack.push(calleeContext);
  return calleeContext;
}

// 9.2.1.2 #sec-ordinarycallbindthis
function OrdinaryCallBindThis(F, calleeContext, thisArgument) {
  const thisMode = F.ThisMode;
  if (thisMode === 'lexical') {
    return new NormalCompletion(Value.undefined);
  }
  const calleeRealm = F.Realm;
  const localEnv = calleeContext.LexicalEnvironment;
  let thisValue;
  if (thisMode === 'strict') {
    thisValue = thisArgument;
  } else {
    if (thisArgument === Value.undefined || thisArgument === Value.null) {
      const globalEnv = calleeRealm.GlobalEnv;
      const globalEnvRec = globalEnv.EnvironmentRecord;
      Assert(globalEnvRec instanceof GlobalEnvironmentRecord);
      thisValue = globalEnvRec.GlobalThisValue;
    } else {
      thisValue = X(ToObject(thisArgument));
      // NOTE: ToObject produces wrapper objects using calleeRealm.
    }
  }
  const envRec = localEnv.EnvironmentRecord;
  Assert(envRec instanceof FunctionEnvironmentRecord);
  Assert(envRec.ThisBindingStatus !== 'initialized');
  return envRec.BindThisValue(thisValue);
}

// 9.2.1.3 #sec-ordinarycallevaluatebody
export function OrdinaryCallEvaluateBody(F, argumentsList) {
  return EnsureCompletion(unwind(EvaluateBody(F.ECMAScriptCode, F, argumentsList)));
}

// 9.2.1 #sec-ecmascript-function-objects-call-thisargument-argumentslist
function FunctionCallSlot(thisArgument, argumentsList) {
  const F = this;

  Assert(isECMAScriptFunctionObject(F));
  if (F.IsClassConstructor === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', F);
  }
  // const callerContext = surroundingAgent.runningExecutionContext;
  const calleeContext = PrepareForOrdinaryCall(F, Value.undefined);
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  OrdinaryCallBindThis(F, calleeContext, thisArgument);
  const result = OrdinaryCallEvaluateBody(F, argumentsList);
  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  if (result.Type === 'return') {
    return new NormalCompletion(result.Value);
  }
  ReturnIfAbrupt(result);
  return new NormalCompletion(Value.undefined);
}

// 9.2.2 #sec-ecmascript-function-objects-construct-argumentslist-newtarget
function FunctionConstructSlot(argumentsList, newTarget) {
  const F = this;

  Assert(isECMAScriptFunctionObject(F));
  Assert(Type(newTarget) === 'Object');
  // const callerContext = surroundingAgent.runningExecutionContext;
  const kind = F.ConstructorKind;
  let thisArgument;
  if (kind === 'base') {
    thisArgument = Q(OrdinaryCreateFromConstructor(newTarget, '%Object.prototype%'));
  }
  const calleeContext = PrepareForOrdinaryCall(F, newTarget);
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  surroundingAgent.runningExecutionContext.callSite.constructCall = true;
  if (kind === 'base') {
    OrdinaryCallBindThis(F, calleeContext, thisArgument);
  }
  const constructorEnv = calleeContext.LexicalEnvironment;
  const envRec = constructorEnv.EnvironmentRecord;
  const result = OrdinaryCallEvaluateBody(F, argumentsList);
  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  if (result.Type === 'return') {
    if (Type(result.Value) === 'Object') {
      return new NormalCompletion(result.Value);
    }
    if (kind === 'base') {
      return new NormalCompletion(thisArgument);
    }
    if (Type(result.Value) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError', 'DerivedConstructorReturnedNonObject');
    }
  } else {
    ReturnIfAbrupt(result);
  }
  return Q(envRec.GetThisBinding());
}

// 9.2.3 #sec-functionallocate
export function OrdinaryFunctionCreate(functionPrototype, ParameterList, Body, thisMode, Scope) {
  Assert(Type(functionPrototype) === 'Object');
  const internalSlotsList = [
    'Environment',
    'FormalParameters',
    'ECMAScriptCode',
    'ConstructorKind',
    'Realm',
    'ScriptOrModule',
    'ThisMode',
    'Strict',
    'HomeObject',
    'SourceText',
    'IsClassConstructor',
  ];
  const F = X(OrdinaryObjectCreate(functionPrototype, internalSlotsList));
  F.Call = FunctionCallSlot;
  F.Environment = Scope;
  F.FormalParameters = ParameterList;
  F.ECMAScriptCode = Body;
  const Strict = isStrictModeCode(Body);
  F.Strict = Strict;
  if (thisMode === 'lexical-this') {
    F.ThisMode = 'lexical';
  } else if (Strict) {
    F.ThisMode = 'strict';
  } else {
    F.ThisMode = 'global';
  }
  F.IsClassConstructor = Value.false;
  F.Environment = Scope;
  F.ScriptOrModule = GetActiveScriptOrModule();
  F.Realm = surroundingAgent.currentRealmRecord;
  F.HomeObject = Value.undefined;
  const len = ExpectedArgumentCount(ParameterList);
  X(SetFunctionLength(F, new Value(len)));
  return F;
}

// 9.2.10 #sec-makeconstructor
export function MakeConstructor(F, writablePrototype, prototype) {
  Assert(isECMAScriptFunctionObject(F));
  Assert(IsConstructor(F) === Value.false);
  Assert(X(IsExtensible(F)) === Value.true && X(HasOwnProperty(F, new Value('prototype'))) === Value.false);
  F.Construct = FunctionConstructSlot;
  F.ConstructorKind = 'base';
  if (writablePrototype === undefined) {
    writablePrototype = true;
  }
  if (prototype === undefined) {
    prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    X(DefinePropertyOrThrow(prototype, new Value('constructor'), Descriptor({
      Value: F,
      Writable: writablePrototype ? Value.true : Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: writablePrototype ? Value.true : Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return new NormalCompletion(Value.undefined);
}

// 9.2.11 #sec-makeclassconstructor
export function MakeClassConstructor(F) {
  Assert(isECMAScriptFunctionObject(F));
  Assert(F.IsClassConstructor === Value.false);
  F.IsClassConstructor = Value.true;
  return new NormalCompletion(Value.undefined);
}

// 9.2.12 #sec-makemethod
export function MakeMethod(F, homeObject) {
  Assert(isECMAScriptFunctionObject(F));
  Assert(Type(homeObject) === 'Object');
  F.HomeObject = homeObject;
  return new NormalCompletion(Value.undefined);
}

// 9.2.13 #sec-setfunctionname
export function SetFunctionName(F, name, prefix) {
  Assert(IsExtensible(F) === Value.true && HasOwnProperty(F, new Value('name')) === Value.false);
  Assert(Type(name) === 'Symbol' || Type(name) === 'String');
  Assert(!prefix || Type(prefix) === 'String');
  if (Type(name) === 'Symbol') {
    const description = name.Description;
    if (Type(description) === 'Undefined') {
      name = new Value('');
    } else {
      name = new Value(`[${description.stringValue()}]`);
    }
  }
  if (prefix !== undefined) {
    name = new Value(`${prefix.stringValue()} ${name.stringValue()}`);
  }
  return X(DefinePropertyOrThrow(F, new Value('name'), Descriptor({
    Value: name,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

// 9.2.14 #sec-setfunctionlength
export function SetFunctionLength(F, length) {
  Assert(IsExtensible(F) === Value.true && HasOwnProperty(F, new Value('length')) === Value.false);
  Assert(Type(length) === 'Number');
  Assert(length.numberValue() >= 0 && X(IsInteger(length)) === Value.true);
  return X(DefinePropertyOrThrow(F, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}


function nativeCall(F, argumentsList, thisArgument, newTarget) {
  return F.nativeFunction(argumentsList, {
    thisValue: thisArgument || Value.undefined,
    NewTarget: newTarget || Value.undefined,
  });
}

function BuiltinFunctionCall(thisArgument, argumentsList) {
  const F = this;

  // const callerContext = surroundingAgent.runningExecutionContext;
  // If callerContext is not already suspended, suspend callerContext.
  const calleeContext = new ExecutionContext();
  calleeContext.Function = F;
  const calleeRealm = F.Realm;
  calleeContext.Realm = calleeRealm;
  calleeContext.ScriptOrModule = F.ScriptOrModule;
  // 8. Perform any necessary implementation-defined initialization of calleeContext.
  surroundingAgent.executionContextStack.push(calleeContext);
  const result = nativeCall(F, argumentsList, thisArgument, Value.undefined);
  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  return result;
}

function BuiltinFunctionConstruct(argumentsList, newTarget) {
  const F = this;

  // const callerContext = surroundingAgent.runningExecutionContext;
  // If callerContext is not already suspended, suspend callerContext.
  const calleeContext = new ExecutionContext();
  calleeContext.Function = F;
  const calleeRealm = F.Realm;
  calleeContext.Realm = calleeRealm;
  calleeContext.ScriptOrModule = F.ScriptOrModule;
  // 8. Perform any necessary implementation-defined initialization of calleeContext.
  surroundingAgent.executionContextStack.push(calleeContext);
  surroundingAgent.runningExecutionContext.callSite.constructCall = true;
  const result = nativeCall(F, argumentsList, undefined, newTarget);
  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  return result;
}

// 9.3.3 #sec-createbuiltinfunction
export function CreateBuiltinFunction(steps, internalSlotsList, realm, prototype, isConstructor = Value.false) {
  // 1. Assert: steps is either a set of algorithm steps or other definition of a function's behaviour provided in this specification.
  Assert(typeof steps === 'function');
  // 2. If realm is not present, set realm to the current Realm Record.
  if (realm === undefined) {
    realm = surroundingAgent.currentRealmRecord;
  }
  // 3. Assert: realm is a Realm Record.
  Assert(realm instanceof Realm);
  // 4. If prototype is not present, set prototype to realm.[[Intrinsics]].[[%Function.prototype%]].
  if (prototype === undefined) {
    prototype = realm.Intrinsics['%Function.prototype%'];
  }
  // 5. Let func be a new built-in function object that when called performs the action described by steps. The new function object has internal slots whose names are the elements of internalSlotsList.
  const func = X(MakeBasicObject(internalSlotsList));
  func.Call = BuiltinFunctionCall;
  if (isConstructor === Value.true) {
    func.Construct = BuiltinFunctionConstruct;
  }
  func.nativeFunction = steps;
  // 6. Set func.[[Realm]] to realm.
  func.Realm = realm;
  // 7. Set func.[[Prototype]] to prototype.
  func.Prototype = prototype;
  // 8. Set func.[[Extensible]] to true.
  func.Extensible = Value.true;
  // 9. Set func.[[Extensible]] to true.
  func.ScriptOrModule = Value.null;
  // 10. Return func.
  return func;
}

// 14.9.3 #sec-preparefortailcall
export function PrepareForTailCall() {
  // 1. Let leafContext be the running execution context.
  const leafContext = surroundingAgent.runningExecutionContext;
  // 2. Suspend leafContext.
  // 3. Pop leafContext from the execution context stack. The execution context now on the top of the stack becomes the running execution context.
  surroundingAgent.executionContextStack.pop(leafContext);
  // 4. Assert: leafContext has no further use. It will never be activated as the running execution context.
  leafContext.poppedForTailCall = true;
}
