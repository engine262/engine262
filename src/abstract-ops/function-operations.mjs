import {
  surroundingAgent,
  ExecutionContext,
} from '../engine.mjs';
import {
  Descriptor,
  SymbolValue,
  ObjectValue,
  UndefinedValue,
  Value,
  PrivateName,
} from '../value.mjs';
import {
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
  ReturnIfAbrupt,
  Completion,
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
  Call,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
  GetActiveScriptOrModule,
  HasOwnProperty,
  IsConstructor,
  IsExtensible,
  MakeBasicObject,
  OrdinaryObjectCreate,
  OrdinaryCreateFromConstructor,
  ToObject,
  PrivateMethodOrAccessorAdd,
  PrivateFieldAdd,
  IsPropertyKey,
  isNonNegativeInteger,
  isStrictModeCode,
  Realm,
  F as toNumberValue,
} from './all.mjs';

// This file covers abstract operations defined in
/** http://tc39.es/ecma262/#sec-ecmascript-function-objects  */
/** http://tc39.es/ecma262/#sec-built-in-function-objects  */
// and
/** http://tc39.es/ecma262/#sec-tail-position-calls  */

export function isECMAScriptFunctionObject(O) {
  return 'ECMAScriptCode' in O;
}

export function isFunctionObject(O) {
  return 'Call' in O;
}

/** http://tc39.es/ecma262/#sec-prepareforordinarycall  */
export function PrepareForOrdinaryCall(F, newTarget) {
  // 1. Assert: Type(newTarget) is Undefined or Object.
  Assert(newTarget instanceof UndefinedValue || newTarget instanceof ObjectValue);
  // 2. Let callerContext be the running execution context.
  // const callerContext = surroundingAgent.runningExecutionContext;
  // 3. Let calleeContext be a new ECMAScript code execution context.
  const calleeContext = new ExecutionContext();
  // 4. Set the Function of calleeContext to F.
  calleeContext.Function = F;
  // 5. Let calleeRealm be F.[[Realm]].
  const calleeRealm = F.Realm;
  // 6. Set the Realm of calleeContext to calleeRealm.
  calleeContext.Realm = calleeRealm;
  // 7. Set the ScriptOrModule of calleeContext to F.[[ScriptOrModule]].
  calleeContext.ScriptOrModule = F.ScriptOrModule;
  // 8. Let localEnv be NewFunctionEnvironment(F, newTarget).
  const localEnv = NewFunctionEnvironment(F, newTarget);
  // 9. Set the LexicalEnvironment of calleeContext to localEnv.
  calleeContext.LexicalEnvironment = localEnv;
  // 10. Set the VariableEnvironment of calleeContext to localEnv.
  calleeContext.VariableEnvironment = localEnv;
  // 11. Set the PrivateEnvironment of calleeContext to F.[[PrivateEnvironment]].
  calleeContext.PrivateEnvironment = F.PrivateEnvironment;
  // 12. Push calleeContext onto the execution context stack; calleeContext is now the running execution context.
  surroundingAgent.executionContextStack.push(calleeContext);
  // 13. NOTE: Any exception objects produced after this point are associated with calleeRealm.
  // 14. Return calleeContext.
  return calleeContext;
}

/** http://tc39.es/ecma262/#sec-ordinarycallbindthis  */
export function OrdinaryCallBindThis(F, calleeContext, thisArgument) {
  // 1. Let thisMode be F.[[ThisMode]].
  const thisMode = F.ThisMode;
  // 2. If thisMode is lexical, return NormalCompletion(undefined).
  if (thisMode === 'lexical') {
    return NormalCompletion(Value.undefined);
  }
  // 3. Let calleeRealm be F.[[Realm]].
  const calleeRealm = F.Realm;
  // 4. Let localEnv be the LexicalEnvironment of calleeContext.
  const localEnv = calleeContext.LexicalEnvironment;
  let thisValue;
  // 5. If thisMode is strict, let thisValue be thisArgument.
  if (thisMode === 'strict') {
    thisValue = thisArgument;
  } else { // 6. Else,
    // a. If thisArgument is undefined or null, then
    if (thisArgument === Value.undefined || thisArgument === Value.null) {
      // i. Let globalEnv be calleeRealm.[[GlobalEnv]].
      const globalEnv = calleeRealm.GlobalEnv;
      // ii. Assert: globalEnv is a global Environment Record.
      Assert(globalEnv instanceof GlobalEnvironmentRecord);
      // iii. Let thisValue be globalEnv.[[GlobalThisValue]].
      thisValue = globalEnv.GlobalThisValue;
    } else { // b. Else,
      // i. Let thisValue be ! ToObject(thisArgument).
      thisValue = X(ToObject(thisArgument));
      // ii. NOTE: ToObject produces wrapper objects using calleeRealm.
    }
  }
  // 7. Assert: localEnv is a function Environment Record.
  Assert(localEnv instanceof FunctionEnvironmentRecord);
  // 8. Assert: The next step never returns an abrupt completion because localEnv.[[ThisBindingStatus]] is not initialized.
  Assert(localEnv.ThisBindingStatus !== 'initialized');
  // 10. Return localEnv.BindThisValue(thisValue).
  return localEnv.BindThisValue(thisValue);
}

/** http://tc39.es/ecma262/#sec-ordinarycallevaluatebody  */
export function OrdinaryCallEvaluateBody(F, argumentsList) {
  // 1. Return the result of EvaluateBody of the parsed code that is F.[[ECMAScriptCode]] passing F and argumentsList as the arguments.
  return EnsureCompletion(unwind(EvaluateBody(F.ECMAScriptCode, F, argumentsList)));
}

/** http://tc39.es/ecma262/#sec-definefield  */
export function DefineField(receiver, fieldRecord) {
  // 1. Let fieldName be fieldRecord.[[Name]].
  const fieldName = fieldRecord.Name;
  // 2. Let initializer be fieldRecord.[[Initializer]].
  const initializer = fieldRecord.Initializer;
  // 3. If initializer is not empty, then
  let initValue;
  if (initializer !== undefined) {
    // a. Let initValue be ? Call(initializer, receiver).
    initValue = Q(Call(initializer, receiver));
  } else { // 4. Else, let initValue be undefined.
    initValue = Value.undefined;
  }
  // 5. If fieldName is a Private Name, then
  if (fieldName instanceof PrivateName) {
    // a. Perform ? PrivateFieldAdd(fieldName, receiver, initValue).
    Q(PrivateFieldAdd(fieldName, receiver, initValue));
  } else { // 6. Else,
    // a. Assert: ! IsPropertyKey(fieldName) is true.
    Assert(X(IsPropertyKey(fieldName)));
    // b. Perform ? CreateDataPropertyOrThrow(receiver, fieldName, initValue).
    Q(CreateDataPropertyOrThrow(receiver, fieldName, initValue));
  }
}

/** http://tc39.es/ecma262/#sec-initializeinstanceelements  */
export function InitializeInstanceElements(O, constructor) {
  // 1. Let methods be the value of constructor.[[PrivateMethods]].
  const methods = constructor.PrivateMethods;
  // 2. For each PrivateElement method of methods, do
  for (const method of methods) {
    // a. Perform ? PrivateMethodOrAccessorAdd(method, O).
    Q(PrivateMethodOrAccessorAdd(method, O));
  }
  // 3. Let fields be the value of constructor.[[Fields]].
  const fields = constructor.Fields;
  // 4. For each element fieldRecord of fields, do
  for (const fieldRecord of fields) {
    // a. Perform ? DefineField(O, fieldRecord).
    Q(DefineField(O, fieldRecord));
  }
}

/** http://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist  */
function FunctionCallSlot(thisArgument, argumentsList) {
  const F = this;

  // 1. Assert: F is an ECMAScript function object.
  Assert(isECMAScriptFunctionObject(F));
  // 2. Let callerContext be the running execution context.
  // 3. Let calleeContext be PrepareForOrdinaryCall(F, undefined).
  const calleeContext = PrepareForOrdinaryCall(F, Value.undefined);
  // 4. Assert: calleeContext is now the running execution context.
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  // 5. If F.[[IsClassConstructor]] is true, then
  if (F.IsClassConstructor === Value.true) {
    // a. Let error be a newly created TypeError object.
    const error = surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', F);
    // b. NOTE: _error_ is created in _calleeContext_ with _F_'s associated Realm Record.
    // c. Remove _calleeContext_ from the execution context stack and restore _callerContext_ as the running execution context.
    surroundingAgent.executionContextStack.pop(calleeContext);
    // d. Return ThrowCompletion(_error_).
    return error;
  }
  // 6. Perform OrdinaryCallBindThis(F, calleeContext, thisArgument).
  OrdinaryCallBindThis(F, calleeContext, thisArgument);
  // 7. Let result be OrdinaryCallEvaluateBody(F, argumentsList).
  const result = OrdinaryCallEvaluateBody(F, argumentsList);
  // 8. Remove calleeContext from the execution context stack and restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  // 9. If result.[[Type]] is return, return NormalCompletion(result.[[Value]]).
  if (result.Type === 'return') {
    return NormalCompletion(result.Value);
  }
  // 10. ReturnIfAbrupt(result).
  ReturnIfAbrupt(result);
  // 11. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}

/** http://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget  */
function FunctionConstructSlot(argumentsList, newTarget) {
  const F = this;

  // 1. Assert: F is an ECMAScript function object.
  Assert(isECMAScriptFunctionObject(F));
  // 2. Assert: Type(newTarget) is Object.
  Assert(newTarget instanceof ObjectValue);
  // 3. Let callerContext be the running execution context.
  // 4. Let kind be F.[[ConstructorKind]].
  const kind = F.ConstructorKind;
  let thisArgument;
  // 5. If kind is base, then
  if (kind === 'base') {
    // a. Let thisArgument be ? OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%").
    thisArgument = Q(OrdinaryCreateFromConstructor(newTarget, '%Object.prototype%'));
  }
  // 6. Let calleeContext be PrepareForOrdinaryCall(F, newTarget).
  const calleeContext = PrepareForOrdinaryCall(F, newTarget);
  // 7. Assert: calleeContext is now the running execution context.
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  surroundingAgent.runningExecutionContext.callSite.constructCall = true;
  // 8. If kind is base, then
  if (kind === 'base') {
    // a. Perform OrdinaryCallBindThis(F, calleeContext, thisArgument).
    OrdinaryCallBindThis(F, calleeContext, thisArgument);
    // b. Let initializeResult be InitializeInstanceElements(thisArgument, F).
    const initializeResult = InitializeInstanceElements(thisArgument, F);
    // c. If initializeResult is an abrupt completion, then
    if (initializeResult instanceof AbruptCompletion) {
      // i. Remove calleeContext from the execution context stack and restore callerContext as the running execution context.
      surroundingAgent.executionContextStack.pop(calleeContext);
      // ii. Return Completion(initializeResult).
      return Completion(initializeResult);
    }
  }
  // 9. Let constructorEnv be the LexicalEnvironment of calleeContext.
  const constructorEnv = calleeContext.LexicalEnvironment;
  // 10. Let result be OrdinaryCallEvaluateBody(F, argumentsList).
  const result = OrdinaryCallEvaluateBody(F, argumentsList);
  // 11. Remove calleeContext from the execution context stack and restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  // 12. If result.[[Type]] is return, then
  if (result.Type === 'return') {
    // a. If Type(result.[[Value]]) is Object, return NormalCompletion(result.[[Value]]).
    if (result.Value instanceof ObjectValue) {
      return NormalCompletion(result.Value);
    }
    // b. If kind is base, return NormalCompletion(thisArgument).
    if (kind === 'base') {
      return NormalCompletion(thisArgument);
    }
    // c. If result.[[Value]] is not undefined, throw a TypeError exception.
    if (result.Value !== Value.undefined) {
      return surroundingAgent.Throw('TypeError', 'DerivedConstructorReturnedNonObject');
    }
  } else { // 13. Else, ReturnIfAbrupt(result).
    ReturnIfAbrupt(result);
  }
  // 14. Return ? constructorEnv.GetThisBinding().
  return Q(constructorEnv.GetThisBinding());
}

/** http://tc39.es/ecma262/#sec-functionallocate  */
export function OrdinaryFunctionCreate(functionPrototype, sourceText, ParameterList, Body, thisMode, Scope, PrivateScope) {
  // 1. Assert: Type(functionPrototype) is Object.
  Assert(functionPrototype instanceof ObjectValue);
  // 2. Let internalSlotsList be the internal slots listed in Table 33.
  const internalSlotsList = [
    'Environment',
    'PrivateEnvironment',
    'FormalParameters',
    'ECMAScriptCode',
    'ConstructorKind',
    'Realm',
    'ScriptOrModule',
    'ThisMode',
    'Strict',
    'HomeObject',
    'SourceText',
    'Fields',
    'PrivateMethods',
    'ClassFieldInitializerName',
    'IsClassConstructor',
  ];
  // 3. Let F be ! OrdinaryObjectCreate(functionPrototype, internalSlotsList).
  const F = X(OrdinaryObjectCreate(functionPrototype, internalSlotsList));
  // 4. Set F.[[Call]] to the definition specified in 10.2.1.
  F.Call = surroundingAgent.hostDefinedOptions.boost?.callFunction || FunctionCallSlot;
  // 5. Set F.[[SourceText]] to sourceText.
  F.SourceText = sourceText;
  // 6. Set F.[[FormalParameters]] to ParameterList.
  F.FormalParameters = ParameterList;
  // 7. Set F.[[ECMAScriptCode]] to Body.
  F.ECMAScriptCode = Body;
  // 8. If the source text matching Body is strict mode code, let Strict be true; else let Strict be false.
  const Strict = isStrictModeCode(Body);
  // 9. Set F.[[Strict]] to Strict.
  F.Strict = Strict;
  // 10. If thisMode is lexical-this, set F.[[ThisMode]] to lexical.
  if (thisMode === 'lexical-this') {
    F.ThisMode = 'lexical';
  } else if (Strict) { // 11. Else if Strict is true, set F.[[ThisMode]] to strict.
    F.ThisMode = 'strict';
  } else { // 12. Else, set F.[[ThisMode]] to global.
    F.ThisMode = 'global';
  }
  // 13. Set F.[[IsClassConstructor]] to false.
  F.IsClassConstructor = Value.false;
  // 14. Set F.[[Environment]] to Scope.
  F.Environment = Scope;
  // 15. Set F.[[PrivateEnvironment]] to PrivateScope.
  Assert(PrivateScope);
  F.PrivateEnvironment = PrivateScope;
  // 16. Set F.[[ScriptOrModule]] to GetActiveScriptOrModule().
  F.ScriptOrModule = GetActiveScriptOrModule();
  // 17. Set F.[[Realm]] to the current Realm Record.
  F.Realm = surroundingAgent.currentRealmRecord;
  // 18. Set F.[[HomeObject]] to undefined.
  F.HomeObject = Value.undefined;
  // 19. Set F.[[ClassFieldInitializerName]] to empty.
  F.ClassFieldInitializerName = undefined;
  F.PrivateMethods = [];
  F.Fields = [];
  // 20. Let len be the ExpectedArgumentCount of ParameterList.
  const len = ExpectedArgumentCount(ParameterList);
  // 21. Perform ! SetFunctionLength(F, len).
  X(SetFunctionLength(F, len));
  // 22. Return F.
  return F;
}

/** http://tc39.es/ecma262/#sec-makeconstructor  */
export function MakeConstructor(F, writablePrototype, prototype) {
  Assert(isECMAScriptFunctionObject(F) || F.Call === BuiltinFunctionCall);
  if (isECMAScriptFunctionObject(F)) {
    Assert(IsConstructor(F) === Value.false);
    Assert(X(IsExtensible(F)) === Value.true && X(HasOwnProperty(F, new Value('prototype'))) === Value.false);
    F.Construct = surroundingAgent.hostDefinedOptions.boost?.constructFunction || FunctionConstructSlot;
  }
  F.ConstructorKind = 'base';
  if (writablePrototype === undefined) {
    writablePrototype = Value.true;
  }
  if (prototype === undefined) {
    prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    X(DefinePropertyOrThrow(prototype, new Value('constructor'), Descriptor({
      Value: F,
      Writable: writablePrototype,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: writablePrototype,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return NormalCompletion(Value.undefined);
}

/** http://tc39.es/ecma262/#sec-makeclassconstructor  */
export function MakeClassConstructor(F) {
  Assert(isECMAScriptFunctionObject(F));
  Assert(F.IsClassConstructor === Value.false);
  F.IsClassConstructor = Value.true;
  return NormalCompletion(Value.undefined);
}

/** http://tc39.es/ecma262/#sec-makemethod  */
export function MakeMethod(F, homeObject) {
  Assert(isECMAScriptFunctionObject(F));
  Assert(homeObject instanceof ObjectValue);
  F.HomeObject = homeObject;
  return NormalCompletion(Value.undefined);
}

/** http://tc39.es/ecma262/#sec-setfunctionname  */
export function SetFunctionName(F, name, prefix) {
  // 1. Assert: F is an extensible object that does not have a "name" own property.
  Assert(IsExtensible(F) === Value.true && HasOwnProperty(F, new Value('name')) === Value.false);
  // 2. If Type(name) is Symbol, then
  if (name instanceof SymbolValue) {
    // a. Let description be name's [[Description]] value.
    const description = name.Description;
    // b. If description is undefined, set name to the empty String.
    if (description === Value.undefined) {
      name = new Value('');
    } else {
      // c. Else, set name to the string-concatenation of "[", description, and "]".
      name = new Value(`[${description.stringValue()}]`);
    }
  } else if (name instanceof PrivateName) { // 3. Else if name is a Private Name, then
    // a. Set name to name.[[Description]].
    name = name.Description;
  }
  // 4. If F has an [[InitialName]] internal slot, then
  if ('InitialName' in F) {
    // a. Set F.[[InitialName]] to name.
    F.InitialName = name;
  }
  // 5. If prefix is present, then
  if (prefix !== undefined) {
    // a. Set name to the string-concatenation of prefix, the code unit 0x0020 (SPACE), and name.
    name = new Value(`${prefix.stringValue()} ${name.stringValue()}`);
    // b. If F has an [[InitialName]] internal slot, then
    if ('InitialName' in F) {
      // i. Optionally, set F.[[InitialName]] to name.
    }
  }
  // 6. Return ! DefinePropertyOrThrow(F, "name", PropertyDescriptor { [[Value]]: name, [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: true }).
  return X(DefinePropertyOrThrow(F, new Value('name'), Descriptor({
    Value: name,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

/** http://tc39.es/ecma262/#sec-setfunctionlength  */
export function SetFunctionLength(F, length) {
  Assert(isNonNegativeInteger(length) || length === Infinity);
  // 1. Assert: F is an extensible object that does not have a "length" own property.
  Assert(IsExtensible(F) === Value.true && HasOwnProperty(F, new Value('length')) === Value.false);
  // 2. Return ! DefinePropertyOrThrow(F, "length", PropertyDescriptor { [[Value]]: 𝔽(length), [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: true }).
  return X(DefinePropertyOrThrow(F, new Value('length'), Descriptor({
    Value: toNumberValue(length),
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

/** http://tc39.es/ecma262/#sec-createbuiltinfunction  */
export function CreateBuiltinFunction(steps, length, name, internalSlotsList, realm, prototype, prefix, isConstructor = Value.false) {
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
  const func = X(MakeBasicObject(['Prototype', 'Extensible', 'Realm', 'ScriptOrModule', 'InitialName'].concat(internalSlotsList)));
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
  // 9. Set func.[[ScriptOrModule]] to null.
  func.ScriptOrModule = Value.null;
  // 10. Set func.[[InitialName]] to null.
  func.InitialName = Value.null;
  // 11. Perform ! SetFunctionLength(func, length).
  X(SetFunctionLength(func, length));
  // 12. If prefix is not present, then
  if (prefix === undefined) {
    // a. Perform ! SetFunctionName(func, name).
    X(SetFunctionName(func, name));
  } else { // 13. Else
    // a. Perform ! SetFunctionName(func, name, prefix).
    X(SetFunctionName(func, name, prefix));
  }
  // 13. Return func.
  return func;
}

/** http://tc39.es/ecma262/#sec-preparefortailcall  */
export function PrepareForTailCall() {
  // 1. Let leafContext be the running execution context.
  const leafContext = surroundingAgent.runningExecutionContext;
  // 2. Suspend leafContext.
  // 3. Pop leafContext from the execution context stack. The execution context now on the top of the stack becomes the running execution context.
  surroundingAgent.executionContextStack.pop(leafContext);
  // 4. Assert: leafContext has no further use. It will never be activated as the running execution context.
  leafContext.poppedForTailCall = true;
}
