import {
  surroundingAgent,
  ExecutionContext,
} from '../host-defined/engine.mts';
import {
  Descriptor,
  SymbolValue,
  ObjectValue,
  UndefinedValue,
  Value,
  PrivateName,
  type Arguments,
  BooleanValue, type PropertyKeyValue, NullValue, JSStringValue,
  type NativeSteps,
} from '../value.mts';
import {
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
  ReturnIfAbrupt,
  Completion,
  Q, X,
  type PlainCompletion,
  ReturnCompletion,
  ThrowCompletion,
} from '../completion.mts';
import { ExpectedArgumentCount } from '../static-semantics/all.mts';
import { ClassFieldDefinitionRecord, EvaluateBody, PrivateElementRecord } from '../runtime-semantics/all.mts';
import {
  EnvironmentRecord,
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
} from '../environment.mts';
import { skipDebugger, type Mutable } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { FunctionProto_toString } from '../intrinsics/FunctionPrototype.mts';
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
  type OrdinaryObject,
  NewPromiseCapability,
  AsyncFunctionStart,
} from './all.mts';
import type {
  AbstractModuleRecord, CanBeNativeSteps, FunctionCallContext, ModuleRecord, PrivateEnvironmentRecord, ScriptRecord,
} from '#self';

interface BaseFunctionObject extends OrdinaryObject {
  readonly Realm: Realm;
  readonly InitialName: JSStringValue | NullValue;
  readonly IsClassConstructor: BooleanValue;
  Call(thisValue: Value, args: Arguments): ValueEvaluator;
  Construct(args: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;
}
export type Body = ParseNode.AsyncGeneratorBody | ParseNode.GeneratorBody | ParseNode.AsyncBody | ParseNode.FunctionBody | ParseNode.AsyncConciseBodyLike | ParseNode.ConciseBodyLike | ParseNode.ClassStaticBlockBody | ParseNode.AssignmentExpressionOrHigher;
export interface ECMAScriptFunctionObject extends BaseFunctionObject {
  readonly Environment: EnvironmentRecord;
  readonly PrivateEnvironment: PrivateEnvironmentRecord | NullValue;
  readonly FormalParameters: ParseNode.FormalParameters;
  readonly ECMAScriptCode?: Body;
  readonly ConstructorKind: 'base' | 'derived';
  readonly ScriptOrModule: ScriptRecord | AbstractModuleRecord;
  readonly ThisMode: 'lexical' | 'strict' | 'global';
  readonly Strict: boolean;
  readonly HomeObject: ObjectValue | UndefinedValue;
  readonly SourceText: string;
  readonly Fields: readonly ClassFieldDefinitionRecord[];
  readonly PrivateMethods: readonly PrivateElementRecord[];
  readonly ClassFieldInitializerName: undefined | PropertyKeyValue | PrivateName;
  /**
   * Note: this is different than InitialName, which is used and observable in Function.prototype.toString.
   * This is only used in the inspector.
   */
  readonly HostInitialName: string;
}
export interface BuiltinFunctionObject extends BaseFunctionObject {
  readonly nativeFunction: NativeSteps;
  // NON-SPEC
  HostCapturedValues?: readonly Value[];
}
export type FunctionObject = ECMAScriptFunctionObject | BuiltinFunctionObject;
// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-ecmascript-function-objects */
/** https://tc39.es/ecma262/#sec-built-in-function-objects */
// and
/** https://tc39.es/ecma262/#sec-tail-position-calls */

export function isECMAScriptFunctionObject(O: undefined | null | Value): O is ECMAScriptFunctionObject {
  return !!O && !('nativeFunction' in O);
}

export function isBuiltinFunctionObject(O: undefined | null | Value): O is BuiltinFunctionObject {
  return !!O && 'nativeFunction' in O;
}

export function isFunctionObject(O: Value): O is FunctionObject {
  return 'Call' in O;
}

/** https://tc39.es/ecma262/#sec-prepareforordinarycall */
export function PrepareForOrdinaryCall(F: ECMAScriptFunctionObject, newTarget: ObjectValue | UndefinedValue) {
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
  const localEnv = new FunctionEnvironmentRecord(F, newTarget);
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

/** https://tc39.es/ecma262/#sec-ordinarycallbindthis */
export function OrdinaryCallBindThis(F: ECMAScriptFunctionObject, calleeContext: ExecutionContext, thisArgument: Value): PlainCompletion<void> {
  // 1. Let thisMode be F.[[ThisMode]].
  const thisMode = F.ThisMode;
  // 2. If thisMode is lexical, return NormalCompletion(undefined).
  if (thisMode === 'lexical') {
    return NormalCompletion(undefined);
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
  Q(localEnv.BindThisValue(thisValue));
}

/** https://tc39.es/ecma262/#sec-ordinarycallevaluatebody */
export function* OrdinaryCallEvaluateBody(F: ECMAScriptFunctionObject, argumentsList: Arguments) {
  // 1. Return the result of EvaluateBody of the parsed code that is F.[[ECMAScriptCode]] passing F and argumentsList as the arguments.
  return EnsureCompletion(yield* (EvaluateBody(F.ECMAScriptCode!, F, argumentsList)));
}

/** https://tc39.es/ecma262/#sec-definefield */
export function* DefineField(receiver: ObjectValue, fieldRecord: ClassFieldDefinitionRecord): PlainEvaluator {
  // 1. Let fieldName be fieldRecord.[[Name]].
  const fieldName = fieldRecord.Name;
  // 2. Let initializer be fieldRecord.[[Initializer]].
  const initializer = fieldRecord.Initializer;
  // 3. If initializer is not empty, then
  let initValue;
  if (initializer !== undefined) {
    // a. Let initValue be ? Call(initializer, receiver).
    initValue = Q(yield* Call(initializer, receiver));
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
    Q(yield* CreateDataPropertyOrThrow(receiver, fieldName, initValue));
  }
}

/** https://tc39.es/ecma262/#sec-initializeinstanceelements */
export function* InitializeInstanceElements(O: ObjectValue, constructor: ECMAScriptFunctionObject): PlainEvaluator {
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
    Q(yield* DefineField(O, fieldRecord));
  }

  // https://tc39.es/proposal-pattern-matching/#sec-initializeinstance
  // 5. Append constructor to O.[[ConstructedBy]].
  O.ConstructedBy.push(constructor);

  // 6. Return unused.
}

/** https://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist */
function* FunctionCallSlot(this: FunctionObject, thisArgument: Value, argumentsList: Arguments): ValueEvaluator {
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
  const result = yield* OrdinaryCallEvaluateBody(F, argumentsList);
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

/** https://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget */
function* FunctionConstructSlot(this: FunctionObject, argumentsList: Arguments, newTarget: FunctionObject): ValueEvaluator<ObjectValue> {
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
    thisArgument = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%Object.prototype%'));
  }
  // 6. Let calleeContext be PrepareForOrdinaryCall(F, newTarget).
  const calleeContext = PrepareForOrdinaryCall(F, newTarget);
  // 7. Assert: calleeContext is now the running execution context.
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  surroundingAgent.runningExecutionContext.callSite.constructCall = true;
  // 8. If kind is base, then
  if (kind === 'base') {
    // a. Perform OrdinaryCallBindThis(F, calleeContext, thisArgument).
    OrdinaryCallBindThis(F, calleeContext, thisArgument!);
    // b. Let initializeResult be InitializeInstanceElements(thisArgument, F).
    const initializeResult = yield* InitializeInstanceElements(thisArgument!, F);
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
  const result = yield* OrdinaryCallEvaluateBody(F, argumentsList);
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
      return NormalCompletion(thisArgument!);
    }
    // c. If result.[[Value]] is not undefined, throw a TypeError exception.
    if (result.Value !== Value.undefined) {
      return surroundingAgent.Throw('TypeError', 'DerivedConstructorReturnedNonObject');
    }
  } else { // 13. Else, ReturnIfAbrupt(result).
    ReturnIfAbrupt(result);
  }
  // 14. Return ? constructorEnv.GetThisBinding().
  return Q((constructorEnv as FunctionEnvironmentRecord).GetThisBinding() as ObjectValue);
}

/** https://tc39.es/ecma262/#sec-functionallocate */
export function OrdinaryFunctionCreate(functionPrototype: ObjectValue, sourceText: string, ParameterList: ParseNode.FormalParameters, Body: Body, thisMode: 'lexical-this' | 'non-lexical-this', Scope: EnvironmentRecord, PrivateEnv: PrivateEnvironmentRecord | NullValue) {
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
    'HostInitialName',
  ];
  // 3. Let F be ! OrdinaryObjectCreate(functionPrototype, internalSlotsList).
  const F = X(OrdinaryObjectCreate(functionPrototype, internalSlotsList)) as Mutable<ECMAScriptFunctionObject>;
  // 4. Set F.[[Call]] to the definition specified in 10.2.1.
  F.Call = FunctionCallSlot;
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
  Assert(!!PrivateEnv);
  F.PrivateEnvironment = PrivateEnv;
  // 16. Set F.[[ScriptOrModule]] to GetActiveScriptOrModule().
  F.ScriptOrModule = GetActiveScriptOrModule() as ScriptRecord | ModuleRecord;
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

/** https://tc39.es/ecma262/#sec-makeconstructor */
export function MakeConstructor(F: Mutable<ECMAScriptFunctionObject> | BuiltinFunctionObject, writablePrototype?: BooleanValue, prototype?: ObjectValue): void {
  Assert(isECMAScriptFunctionObject(F) || F.Call === BuiltinFunctionCall);
  if (isECMAScriptFunctionObject(F)) {
    // Assert(!IsConstructor(F)); but not applying type assertion
    Assert(![IsConstructor(F)][0]);
    Assert(X(IsExtensible(F)) === Value.true && X(HasOwnProperty(F, Value('prototype'))) === Value.false);
    F.Construct = FunctionConstructSlot;
  }
  (F as Mutable<ECMAScriptFunctionObject>).ConstructorKind = 'base';
  if (writablePrototype === undefined) {
    writablePrototype = Value.true;
  }
  if (prototype === undefined) {
    prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    X(DefinePropertyOrThrow(prototype, Value('constructor'), Descriptor({
      Value: F,
      Writable: writablePrototype,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }
  X(DefinePropertyOrThrow(F, Value('prototype'), Descriptor({
    Value: prototype,
    Writable: writablePrototype,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
}

/** https://tc39.es/ecma262/#sec-makeclassconstructor */
export function MakeClassConstructor(F: Mutable<FunctionObject>): void {
  Assert(F.IsClassConstructor === Value.false);
  F.IsClassConstructor = Value.true;
}

/** https://tc39.es/ecma262/#sec-makemethod */
export function MakeMethod(F: Mutable<ECMAScriptFunctionObject>, homeObject: ObjectValue): void {
  Assert(isECMAScriptFunctionObject(F));
  Assert(homeObject instanceof ObjectValue);
  F.HomeObject = homeObject;
}

/** https://tc39.es/ecma262/#sec-setfunctionname */
export function SetFunctionName(F: FunctionObject, name: PropertyKeyValue | PrivateName, prefix?: JSStringValue): void {
  // 1. Assert: F is an extensible object that does not have a "name" own property.
  Assert(skipDebugger(IsExtensible(F)) === Value.true && skipDebugger(HasOwnProperty(F, Value('name'))) === Value.false);
  // 2. If Type(name) is Symbol, then
  if (name instanceof SymbolValue) {
    // a. Let description be name's [[Description]] value.
    const description = name.Description;
    // b. If description is undefined, set name to the empty String.
    if (description === Value.undefined) {
      name = Value('');
    } else {
      // c. Else, set name to the string-concatenation of "[", description, and "]".
      name = Value(`[${(description as JSStringValue).stringValue()}]`);
    }
  } else if (name instanceof PrivateName) { // 3. Else if name is a Private Name, then
    // a. Set name to name.[[Description]].
    name = name.Description;
  }
  // 4. If F has an [[InitialName]] internal slot, then
  if ('InitialName' in F) {
    // a. Set F.[[InitialName]] to name.
    (F as Mutable<FunctionObject>).InitialName = name;
  }
  if ('HostInitialName' in F) {
    // a. Set F.[[InitialName]] to name.
    (F as Mutable<ECMAScriptFunctionObject>).HostInitialName = name.stringValue();
  }
  // 5. If prefix is present, then
  if (prefix !== undefined) {
    // a. Set name to the string-concatenation of prefix, the code unit 0x0020 (SPACE), and name.
    name = Value(`${prefix.stringValue()} ${name.stringValue()}`);
    // b. If F has an [[InitialName]] internal slot, then
    if ('InitialName' in F) {
      // i. Optionally, set F.[[InitialName]] to name.
    }
  }
  // 6. Return ! DefinePropertyOrThrow(F, "name", PropertyDescriptor { [[Value]]: name, [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: true }).
  X(DefinePropertyOrThrow(F, Value('name'), Descriptor({
    Value: name,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

/** https://tc39.es/ecma262/#sec-setfunctionlength */
export function SetFunctionLength(F: FunctionObject, length: number): void {
  Assert(isNonNegativeInteger(length) || length === Infinity);
  // 1. Assert: F is an extensible object that does not have a "length" own property.
  Assert(skipDebugger(IsExtensible(F)) === Value.true && skipDebugger(HasOwnProperty(F, Value('length'))) === Value.false);
  // 2. Return ! DefinePropertyOrThrow(F, "length", PropertyDescriptor { [[Value]]: 𝔽(length), [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: true }).
  X(DefinePropertyOrThrow(F, Value('length'), Descriptor({
    Value: toNumberValue(length),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

function BuiltinFunctionCall(this: BuiltinFunctionObject, thisArgument: Value, argumentsList: Arguments): ValueEvaluator {
  return BuiltinCallOrConstruct(this, thisArgument, argumentsList, Value.undefined);
}

function BuiltinFunctionConstruct(this: BuiltinFunctionObject, argumentsList: Arguments, newTarget: FunctionObject): ValueEvaluator<ObjectValue> {
  // Assert in the BuiltinCallOrConstruct
  return BuiltinCallOrConstruct(this, 'uninitialized', argumentsList, newTarget) as ValueEvaluator<ObjectValue>;
}

/** https://tc39.es/ecma262/#sec-builtincallorconstruct */
function* BuiltinCallOrConstruct(F: BuiltinFunctionObject, thisArgument: Value | 'uninitialized', argumentsList: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator {
  const calleeContext = new ExecutionContext();
  calleeContext.Function = F;
  const calleeRealm = F.Realm;
  calleeContext.Realm = calleeRealm;
  calleeContext.ScriptOrModule = Value.null;
  surroundingAgent.executionContextStack.push(calleeContext);

  const isNew = thisArgument === 'uninitialized';
  // Perform any necessary implementation-defined initialization of calleeContext.
  surroundingAgent.runningExecutionContext.callSite.constructCall = isNew;

  let completion = F.nativeFunction(argumentsList, {
    thisValue: thisArgument === 'uninitialized' ? Value.undefined : thisArgument,
    NewTarget: newTarget,
  });
  // in case of debugging, use the following version so F.nativeFunction's name can appears in the stack trace.
  // let completion = Reflect['apply'](F.nativeFunction, F, [argumentsList, {
  //   thisValue: thisArgument || Value.undefined,
  //   NewTarget: newTarget || Value.undefined,
  // }]);
  if (completion && 'next' in completion) {
    completion = yield* completion;
  }
  if (completion instanceof Completion) {
    Assert(completion instanceof NormalCompletion || completion instanceof ThrowCompletion);
  }

  surroundingAgent.executionContextStack.pop(calleeContext);
  const result = Q(completion) || Value.undefined;
  if (isNew) {
    Assert(result instanceof ObjectValue);
  }
  return result;
}

/** https://tc39.es/ecma262/#sec-createbuiltinfunction */
export function CreateBuiltinFunction(steps: NativeSteps, length: number, name: PropertyKeyValue | PrivateName, internalSlotsList: readonly string[], realm?: Realm, prototype?: ObjectValue | NullValue, prefix?: JSStringValue, isConstructor: BooleanValue = Value.false): BuiltinFunctionObject {
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
  const func = X(MakeBasicObject(['Prototype', 'Extensible', 'Realm', 'ScriptOrModule', 'InitialName', 'IsClassConstructor'].concat(internalSlotsList))) as Mutable<BuiltinFunctionObject>;
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
  // 10. Set func.[[InitialName]] to null.
  func.InitialName = Value.null;
  // https://github.com/tc39/ecma262/pull/3212/
  func.IsClassConstructor = Value.false;
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

/** This is a helper function to define non-spec host functions. */
CreateBuiltinFunction.from = (steps: CanBeNativeSteps, name = steps.name) => CreateBuiltinFunction(Reflect.apply.bind(null, steps, null), steps.length, Value(name), []);

/**
 * @internal
 * in https://tc39.es/proposal-array-from-async/#sec-array.fromAsync
 * "This async method performs the following steps when called:"
 *
 * this function wraps the async function.
 */
export function asyncBuiltinFunctionPrologue(steps: NativeSteps): NativeSteps {
  function* async(this: BuiltinFunctionObject, args: Arguments, context: FunctionCallContext) {
    const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    const self = this;
    yield* AsyncFunctionStart(promiseCapability, function* asyncFunctionPrologue() {
      let result = Reflect.apply(steps, self, [args, context]);
      if (result && 'next' in result) {
        result = yield* result;
      }
      return ReturnCompletion(Q(result) || Value.undefined);
    });
    return NormalCompletion(promiseCapability.Promise);
  }
  async.section = steps.section;
  return async;
}

/** https://tc39.es/ecma262/#sec-preparefortailcall */
export function PrepareForTailCall() {
  // 1. Let leafContext be the running execution context.
  const leafContext = surroundingAgent.runningExecutionContext;
  // 2. Suspend leafContext.
  // 3. Pop leafContext from the execution context stack. The execution context now on the top of the stack becomes the running execution context.
  surroundingAgent.executionContextStack.pop(leafContext);
  // 4. Assert: leafContext has no further use. It will never be activated as the running execution context.
  leafContext.poppedForTailCall = true;
}

/** NON-SPEC */
export function IntrinsicsFunctionToString(F: FunctionObject) {
  return X(FunctionProto_toString([], { thisValue: F, NewTarget: Value.undefined })).stringValue();
}
