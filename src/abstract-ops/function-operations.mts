import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import { ExecutionContext } from '../execution-context/ExecutionContext.mts';
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
  NumberValue,
} from '../value.mts';
import {
  EnsureCompletion,
  NormalCompletion,
  AbruptCompletion,
  Completion,
  Q, X,
  type PlainCompletion,
  ReturnCompletion,
  ThrowCompletion,
} from '../completion.mts';
import { ExpectedArgumentCount } from '../static-semantics/all.mts';
import {
  ClassFieldDefinitionRecord, EvaluateBody, PrivateElementRecord,
} from '../runtime-semantics/all.mts';
import { skipDebugger, type Mutable } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { FunctionProto_toString } from '../intrinsics/FunctionPrototype.mts';
import {
  Assert,
  Call,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
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
  F as toNumberValue,
  type OrdinaryObject,
  NewPromiseCapability,
  AsyncFunctionStart,
  Get,
  R,
  ToIntegerOrInfinity,
  InitializePrivateMethods,
  getActiveScriptId,
} from './all.mts';
import {
  GetActiveScriptOrModule,
  Realm,
  EnvironmentRecord,
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  ClassElementDefinitionRecord,
  type AbstractModuleRecord, type CanBeNativeSteps, type DefaultConstructorBuiltinFunction, type DescriptorInit, type FunctionCallContext, type ModuleRecord, type PrivateEnvironmentRecord, type ScriptRecord,
} from '#self';

interface BaseFunctionObject extends OrdinaryObject {
  readonly Realm: Realm;
  readonly InitialName: JSStringValue | NullValue;
  readonly Async: boolean;
  // https://github.com/tc39/ecma262/pull/3212/
  readonly IsClassConstructor: BooleanValue;
  Call(thisValue: Value, args: Arguments): ValueEvaluator;
  Construct(args: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;
}
export type Body = ParseNode.AsyncGeneratorBody | ParseNode.GeneratorBody | ParseNode.AsyncBody | ParseNode.FunctionBody | ParseNode.AsyncConciseBodyLike | ParseNode.ConciseBodyLike | ParseNode.ClassStaticBlockBody | ParseNode.AssignmentExpressionOrHigher;
export interface ECMAScriptFunctionObject extends BaseFunctionObject {
  readonly Environment: EnvironmentRecord;
  readonly PrivateEnvironment: PrivateEnvironmentRecord | NullValue;
  readonly FormalParameters: ParseNode.FormalParameters;
  readonly ECMAScriptCode: Body | null;
  readonly ConstructorKind: 'base' | 'derived';
  readonly ScriptOrModule: ScriptRecord | AbstractModuleRecord;
  readonly scriptId?: string;
  readonly ThisMode: 'lexical' | 'strict' | 'global';
  readonly Strict: boolean;
  readonly HomeObject: ObjectValue | UndefinedValue;
  readonly SourceText: string;
  // -decorator
  readonly Fields: readonly ClassFieldDefinitionRecord[];
  readonly PrivateMethods: readonly PrivateElementRecord[];
  // +decorator (Fields => Elements, PrivateMethods => Initializers)
  readonly Elements: readonly ClassElementDefinitionRecord[];
  readonly Initializers: readonly FunctionObject[];
  readonly ClassFieldInitializerName: undefined | PropertyKeyValue | PrivateName;
  /**
   * Note: this is different than InitialName, which is used and observable in Function.prototype.toString.
   * This is only used in the inspector.
   */
  readonly HostInitialName: PropertyKeyValue | PrivateName;
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

export function hasSourceTextInternalSlot(O: undefined | null | Value): O is FunctionObject & { readonly SourceText:string } {
  return !!O && 'SourceText' in O && typeof O.SourceText === 'string';
}

export function isECMAScriptFunctionObject(O: undefined | null | Value): O is ECMAScriptFunctionObject {
  return !!O && 'ECMAScriptCode' in O;
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
  calleeContext.HostDefined ??= {};
  calleeContext.HostDefined.scriptId = F.scriptId;
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

// -decorator (removed in the decorator proposal)
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
    Q(yield* PrivateFieldAdd(receiver, fieldName, initValue));
  } else { // 6. Else,
    // a. Assert: ! IsPropertyKey(fieldName) is true.
    Assert(X(IsPropertyKey(fieldName)));
    // b. Perform ? CreateDataPropertyOrThrow(receiver, fieldName, initValue).
    Q(yield* CreateDataPropertyOrThrow(receiver, fieldName, initValue));
  }
}

/** https://tc39.es/ecma262/#sec-initializeinstanceelements */
/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-initializeinstanceelements */
export function* InitializeInstanceElements(O: ObjectValue, constructor: ECMAScriptFunctionObject | DefaultConstructorBuiltinFunction): PlainEvaluator {
  if (surroundingAgent.feature('decorators')) {
    const elements = constructor.Elements;
    Q(yield* InitializePrivateMethods(O, elements));
    for (const initializer of constructor.Initializers) {
      Q(yield* Call(initializer, O));
    }
    for (const e of elements) {
      if (e instanceof ClassElementDefinitionRecord && (e.Kind === 'field' || e.Kind === 'accessor')) {
        Q(yield* InitializeFieldOrAccessor(O, e));
      }
    }
  } else {
    // 1. Let methods be the value of constructor.[[PrivateMethods]].
    const methods = constructor.PrivateMethods;
    // 2. For each PrivateElement method of methods, do
    for (const method of methods) {
      // a. Perform ? PrivateMethodOrAccessorAdd(method, O).
      Q(yield* PrivateMethodOrAccessorAdd(O, method));
    }
    // 3. Let fields be the value of constructor.[[Fields]].
    const fields = constructor.Fields;
    // 4. For each element fieldRecord of fields, do
    for (const fieldRecord of fields) {
      // a. Perform ? DefineField(O, fieldRecord).
      Q(yield* DefineField(O, fieldRecord));
    }
  }
  // https://tc39.es/proposal-pattern-matching/#sec-initializeinstance
  // 5. Append constructor to O.[[ConstructedBy]].
  O.ConstructedBy.push(constructor);
}

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-initializefieldoraccessor */
export function* InitializeFieldOrAccessor(receiver: ObjectValue, elementRecord: ClassElementDefinitionRecord): PlainEvaluator<void> {
  Assert(elementRecord.Kind === 'field' || elementRecord.Kind === 'accessor');
  const fieldName = elementRecord.Kind === 'accessor' ? elementRecord.BackingStorageKey : elementRecord.Key;
  let initValue: Value;
  // TODO(decorator): spec bug. ApplyDecoratorsToElementDefinition unshift decorator initializers into this array, but read it in order, so the spec order is wrong (be like [decorator2, decorator1, syntaxInit], but the correct order should be [syntaxInit, decorator2, decorator1])
  if (!surroundingAgent.feature('decorators.no-bugfix.1') && elementRecord.Initializers[-1]) {
    initValue = Q(yield* Call(elementRecord.Initializers[-1], receiver));
  } else {
    initValue = Value.undefined;
  }

  for (const initializer of elementRecord.Initializers) {
    initValue = Q(yield* Call(initializer, receiver, [initValue]));
  }
  if (fieldName instanceof PrivateName) {
    Q(yield* PrivateFieldAdd(receiver, fieldName, initValue));
  } else {
    Assert(IsPropertyKey(fieldName));
    Q(yield* CreateDataPropertyOrThrow(receiver, fieldName, initValue));
  }
  for (const initializer of elementRecord.ExtraInitializers) {
    Q(yield* Call(initializer, receiver));
  }
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
  Q(result);
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
  } else {
    Q(result);
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
    surroundingAgent.feature('decorators') ? 'Elements' : 'Fields',
    surroundingAgent.feature('decorators') ? 'Initializers' : 'PrivateMethods',
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
  F.scriptId = getActiveScriptId();
  // 17. Set F.[[Realm]] to the current Realm Record.
  F.Realm = surroundingAgent.currentRealmRecord;
  // 18. Set F.[[HomeObject]] to undefined.
  F.HomeObject = Value.undefined;
  // 19. Set F.[[ClassFieldInitializerName]] to empty.
  F.ClassFieldInitializerName = undefined;
  if (surroundingAgent.feature('decorators')) {
    F.Initializers = [];
    F.Elements = [];
  } else {
    F.PrivateMethods = [];
    F.Fields = [];
  }
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

/** https://arai-a.github.io/ecma262-compare/snapshot.html?pr=2417#sec-definemethodproperty */
export function* DefineMethodProperty(homeObject: ObjectValue, methodDefinition: ClassElementDefinitionRecord, enumerable: boolean): PlainEvaluator<void> {
  // TODO(decorator): spec bug or our bug?
  // Assert(isOrdinaryObject(homeObject) && homeObject.Extensible === Value.true && [...homeObject.properties.values()].every((desc) => desc.Configurable === Value.true));
  Assert(methodDefinition.Kind === 'method' || methodDefinition.Kind === 'getter' || methodDefinition.Kind === 'setter' || methodDefinition.Kind === 'accessor');
  const key = methodDefinition.Key;
  if (!(key instanceof PrivateName)) {
    const desc: Mutable<DescriptorInit> = { Enumerable: Value(enumerable), Configurable: Value.true };
    if (methodDefinition.Kind === 'getter' || methodDefinition.Kind === 'accessor') {
      desc.Get = methodDefinition.Get;
    }
    if (methodDefinition.Kind === 'setter' || methodDefinition.Kind === 'accessor') {
      desc.Set = methodDefinition.Set;
    }
    if (methodDefinition.Kind === 'method') {
      desc.Value = methodDefinition.Value;
      desc.Writable = Value.true;
    }
    Q(yield* DefinePropertyOrThrow(homeObject, key, new Descriptor(desc)));
  }
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
    (F as Mutable<ECMAScriptFunctionObject>).HostInitialName = name;
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

const { apply } = Reflect;
/** https://tc39.es/ecma262/#sec-builtincallorconstruct */
function* BuiltinCallOrConstruct(F: BuiltinFunctionObject, thisArgument: Value | 'uninitialized', argumentsList: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator {
  const calleeContext = new ExecutionContext();
  calleeContext.Function = F;
  const calleeRealm = F.Realm;
  calleeContext.Realm = calleeRealm;
  calleeContext.ScriptOrModule = Value.null;
  surroundingAgent.executionContextStack.push(calleeContext);

  const isNew = thisArgument === 'uninitialized';
  const thisValue = thisArgument === 'uninitialized' ? Value.undefined : thisArgument;
  // Perform any necessary implementation-defined initialization of calleeContext.
  surroundingAgent.runningExecutionContext.callSite.constructCall = isNew;
  const functionCallContext: FunctionCallContext = {
    thisValue,
    NewTarget: newTarget,
  };
  if (F.Async) {
    const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
    const resultClosure = function* asyncFunctionPrologue() {
      let result = apply(F.nativeFunction, F, [argumentsList, functionCallContext]);
      if (result && 'next' in result) {
        result = yield* result;
      }
      return ReturnCompletion(Q(result) || Value.undefined);
    };
    yield* AsyncFunctionStart(promiseCapability, resultClosure);
    surroundingAgent.executionContextStack.pop(calleeContext);
    return NormalCompletion(promiseCapability.Promise);
  } else {
    let result = apply(F.nativeFunction, F, [argumentsList, functionCallContext]);
    if (result && 'next' in result) {
      result = yield* result;
    }
    if (result instanceof Completion) {
      Assert(result instanceof NormalCompletion || result instanceof ThrowCompletion);
    }

    surroundingAgent.executionContextStack.pop(calleeContext);
    const value = Q(result);
    if (isNew && !(result instanceof ThrowCompletion)) {
      Assert(result instanceof ObjectValue);
    }
    return NormalCompletion(value || Value.undefined);
  }
}

/** https://tc39.es/ecma262/#sec-createbuiltinfunction */
export function CreateBuiltinFunction(behaviour: NativeSteps, length: number, name: string | PropertyKeyValue | PrivateName, additionalInternalSlotsList: readonly string[], realm?: Realm, prototype?: ObjectValue | NullValue, prefix?: JSStringValue, async = false): BuiltinFunctionObject {
  if (typeof name === 'string') {
    name = Value(name);
  }
  // 1. Assert: steps is either a set of algorithm steps or other definition of a function's behaviour provided in this specification.
  Assert(typeof behaviour === 'function');
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
  const func = X(MakeBasicObject(['Prototype', 'Extensible', 'Realm', 'ScriptOrModule', 'InitialName', 'IsClassConstructor'].concat(additionalInternalSlotsList))) as Mutable<BuiltinFunctionObject>;
  func.Call = BuiltinFunctionCall;
  if (behaviour.isConstructor) {
    func.Construct = BuiltinFunctionConstruct;
  }
  func.nativeFunction = behaviour;
  func.Async = async;
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
CreateBuiltinFunction.from = (steps: CanBeNativeSteps, name = steps.name, async = false) => CreateBuiltinFunction(Reflect.apply.bind(null, steps, null), steps.length, name, [], surroundingAgent.currentRealmRecord, undefined, undefined, async);

export function markBuiltinFunctionAsConstructor(steps: NativeSteps) {
  steps.isConstructor = true;
  return steps;
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

/** https://tc39.es/proposal-shadowrealm/#sec-copynameandlength */
export function* CopyNameAndLength(F: FunctionObject, Target: FunctionObject, prefix?: string, argCount = 0): PlainEvaluator {
  let L = 0;
  const targetHasLength = Q(yield* HasOwnProperty(Target, Value('length')));
  if (targetHasLength === Value.true) {
    const targetLen = Q(yield* Get(Target, Value('length')));
    if (targetLen instanceof NumberValue) {
      if (R(targetLen) === Infinity) {
        L = Infinity;
      } else if (R(targetLen) === -Infinity) {
        L = 0;
      } else {
        const targetLenAsInt = X(ToIntegerOrInfinity(targetLen));
        Assert(Number.isFinite(targetLenAsInt));
        L = Math.max(targetLenAsInt - argCount, 0);
      }
    }
  }
  SetFunctionLength(F, L);
  let targetName = Q(yield* Get(Target, Value('name')));
  if (!(targetName instanceof JSStringValue)) {
    targetName = Value('');
  }
  if (prefix !== undefined) {
    SetFunctionName(F, targetName, Value(prefix));
  } else {
    SetFunctionName(F, targetName);
  }
}

/** NON-SPEC */
export function IntrinsicsFunctionToString(F: FunctionObject) {
  return X(FunctionProto_toString([], { thisValue: F, NewTarget: Value.undefined })).stringValue();
}
