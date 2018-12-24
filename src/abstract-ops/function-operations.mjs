import {
  surroundingAgent,
  // Suspend,
  ExecutionContext,
} from '../engine.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  GetActiveScriptOrModule,
  HasOwnProperty,
  IsConstructor,
  IsExtensible,
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  ToInteger,
  ToObject,
} from './all.mjs';
import {
  Descriptor,
  FunctionValue,
  Type,
  Value,
} from '../value.mjs';
import {
  EnsureCompletion, NormalCompletion, Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import {
  ExpectedArgumentCount_ArrowParameters,
  ExpectedArgumentCount_FormalParameters,
} from '../static-semantics/all.mjs';
import {
  EvaluateBody_AsyncConciseBody_AssignmentExpression,
  EvaluateBody_AsyncFunctionBody,
  EvaluateBody_ConciseBody_Expression,
  EvaluateBody_FunctionBody,
  EvaluateBody_GeneratorBody,
  EvaluateBody_AsyncGeneratorBody,
  getFunctionBodyType,
} from '../runtime-semantics/all.mjs';
import {
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  NewFunctionEnvironment,
} from '../environment.mjs';
import { unwind, OutOfRange } from '../helpers.mjs';

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
  Assert(length.numberValue() >= 0 && X(ToInteger(length)).numberValue() === length.numberValue());
  return X(DefinePropertyOrThrow(F, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

// 14.9.3 #sec-preparefortailcall
export function PrepareForTailCall() {
  // const leafContext = surroundingAgent.runningExecutionContext;
  // Suspend(leafContext);
  // surroundingAgent.executionContextStack.pop();
  // Assert: leafContext has no further use. It will never
  // be activated as the running execution context.
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

// 9.2.1 #sec-ecmascript-function-objects-call-thisargument-argumentslist
function FunctionCallSlot(thisArgument, argumentsList) {
  const F = this;

  Assert(F instanceof FunctionValue);
  if (F.FunctionKind === 'classConstructor') {
    return surroundingAgent.Throw('TypeError', 'Class constructor cannot be called without `new`');
  }
  // const callerContext = surroundingAgent.runningExecutionContext;
  const calleeContext = PrepareForOrdinaryCall(F, Value.undefined);
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  OrdinaryCallBindThis(F, calleeContext, thisArgument);
  const result = EnsureCompletion(unwind(OrdinaryCallEvaluateBody(F, argumentsList)));
  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop(calleeContext);
  if (result.Type === 'return') {
    return new NormalCompletion(result.Value);
  }
  ReturnIfAbrupt(result);
  return new NormalCompletion(Value.undefined);
}

function FunctionConstructSlot(argumentsList, newTarget) {
  const F = this;

  Assert(F instanceof FunctionValue);
  Assert(Type(newTarget) === 'Object');
  // const callerContext = surroundingAgent.runningExecutionContext;
  const kind = F.ConstructorKind;
  let thisArgument;
  if (kind === 'base') {
    thisArgument = Q(OrdinaryCreateFromConstructor(newTarget, '%ObjectPrototype%'));
  }
  const calleeContext = PrepareForOrdinaryCall(F, newTarget);
  Assert(surroundingAgent.runningExecutionContext === calleeContext);
  if (kind === 'base') {
    OrdinaryCallBindThis(F, calleeContext, thisArgument);
  }
  const constructorEnv = calleeContext.LexicalEnvironment;
  const envRec = constructorEnv.EnvironmentRecord;
  const result = EnsureCompletion(unwind(OrdinaryCallEvaluateBody(F, argumentsList)));
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
      return surroundingAgent.Throw('TypeError', 'Derived constructors may only return object or undefined');
    }
  } else {
    ReturnIfAbrupt(result);
  }
  return Q(envRec.GetThisBinding());
}

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
export function* OrdinaryCallEvaluateBody(F, argumentsList) {
  switch (getFunctionBodyType(F.ECMAScriptCode)) {
    // FunctionBody : FunctionStatementList
    // ConciseBody : `{` FunctionBody `}`
    case 'FunctionBody':
    case 'ConciseBody_FunctionBody':
      return yield* EvaluateBody_FunctionBody(F.ECMAScriptCode.body.body, F, argumentsList);

    // ConciseBody : AssignmentExpression
    case 'ConciseBody_Expression':
      return yield* EvaluateBody_ConciseBody_Expression(F.ECMAScriptCode.body, F, argumentsList);

    case 'GeneratorBody':
      return yield* EvaluateBody_GeneratorBody(F.ECMAScriptCode.body.body, F, argumentsList);

    case 'AsyncFunctionBody':
    case 'AsyncConciseBody_AsyncFunctionBody':
      return yield* EvaluateBody_AsyncFunctionBody(F.ECMAScriptCode.body.body, F, argumentsList);

    case 'AsyncConciseBody_AssignmentExpression':
      return yield* EvaluateBody_AsyncConciseBody_AssignmentExpression(F.ECMAScriptCode.body, F, argumentsList);

    case 'AsyncGeneratorBody':
      return yield* EvaluateBody_AsyncGeneratorBody(F.ECMAScriptCode.body.body, F, argumentsList);

    default:
      throw new OutOfRange('OrdinaryCallEvaluateBody', F.ECMAScriptCode);
  }
}

// 9.2 #sec-ecmascript-function-objects
const esFunctionInternalSlots = Object.freeze([
  'Environment',
  'FormalParameters',
  'FunctionKind',
  'ECMAScriptCode',
  'ConstructorKind',
  'Realm',
  'ScriptOrModule',
  'ThisMode',
  'Strict',
  'HomeObject',
]);

// 9.2.3 #sec-functionallocate
export function FunctionAllocate(functionPrototype, strict, functionKind) {
  Assert(Type(functionPrototype) === 'Object');
  Assert(['normal', 'non-constructor', 'generator', 'async', 'async generator']
    .includes(functionKind));
  const needsConstruct = functionKind === 'normal';
  if (functionKind === 'non-constructor') {
    functionKind = 'Normal';
  }
  const F = new FunctionValue(functionPrototype);
  for (const internalSlot of esFunctionInternalSlots) {
    F[internalSlot] = Value.undefined;
  }
  F.Call = FunctionCallSlot;
  if (needsConstruct) {
    F.Construct = FunctionConstructSlot;
    F.ConstructorKind = 'base';
  }
  F.Strict = strict;
  F.FunctionKind = functionKind;
  F.Prototype = functionPrototype;
  F.Extensible = Value.true;
  F.Realm = surroundingAgent.currentRealmRecord;
  return F;
}

// 9.2.4 #sec-functioninitialize
export function FunctionInitialize(F, kind, ParameterList, Body, Scope) {
  let len;
  switch (kind) {
    case 'Normal':
    case 'Method':
      len = ExpectedArgumentCount_FormalParameters(ParameterList);
      break;

    case 'Arrow':
      len = ExpectedArgumentCount_ArrowParameters(ParameterList);
      break;

    default:
      throw new OutOfRange('FunctionInitialize kind', kind);
  }
  X(SetFunctionLength(F, new Value(len)));
  const Strict = F.Strict;
  F.Environment = Scope;
  F.FormalParameters = ParameterList;
  F.ECMAScriptCode = Body;
  F.ScriptOrModule = GetActiveScriptOrModule();
  if (kind === 'Arrow') {
    F.ThisMode = 'lexical';
  } else if (Strict) {
    F.ThisMode = 'strict';
  } else {
    F.ThisMode = 'global';
  }
  return F;
}

// 9.2.5 #sec-functioncreate
// Instead of taking in a {Async}Function/Concise/GeneratorBody for Body, we
// instead take in the entire function node as Body and save it in
// ECMAScriptCode as such.
export function FunctionCreate(kind, ParameterList, Body, Scope, Strict, prototype) {
  if (prototype === undefined) {
    prototype = surroundingAgent.intrinsic('%FunctionPrototype%');
  }
  const allocKind = kind === 'Normal' ? 'normal' : 'non-constructor';
  const F = FunctionAllocate(prototype, Strict, allocKind);
  return FunctionInitialize(F, kind, ParameterList, Body, Scope);
}

// 9.2.6 #sec-generatorfunctioncreate
export function GeneratorFunctionCreate(kind, ParameterList, Body, Scope, Strict) {
  const functionPrototype = surroundingAgent.intrinsic('%Generator%');
  const F = FunctionAllocate(functionPrototype, Strict, 'generator');
  return FunctionInitialize(F, kind, ParameterList, Body, Scope);
}

// 9.2.7 #sec-asyncgeneratorfunctioncreate
export function AsyncGeneratorFunctionCreate(kind, ParameterList, Body, Scope, Strict) {
  const functionPrototype = surroundingAgent.intrinsic('%AsyncGenerator%');
  const F = X(FunctionAllocate(functionPrototype, Strict, 'generator'));
  return X(FunctionInitialize(F, kind, ParameterList, Body, Scope));
}

// 9.2.8 #sec-async-functions-abstract-operations-async-function-create
export function AsyncFunctionCreate(kind, parameters, body, Scope, Strict) {
  const functionPrototype = surroundingAgent.intrinsic('%AsyncFunctionPrototype%');
  const F = X(FunctionAllocate(functionPrototype, Strict, 'async'));
  return X(FunctionInitialize(F, kind, parameters, body, Scope));
}

// 9.2.10 #sec-makeconstructor
export function MakeConstructor(F, writablePrototype, prototype) {
  Assert(F instanceof FunctionValue);
  Assert(IsConstructor(F) === Value.true);
  Assert(X(IsExtensible(F)) === Value.true && X(HasOwnProperty(F, new Value('prototype'))) === Value.false);
  if (writablePrototype === undefined) {
    writablePrototype = true;
  }
  if (prototype === undefined) {
    prototype = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
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
  Assert(F instanceof FunctionValue);
  Assert(F.FunctionKind === 'normal');
  F.FunctionKind = 'classConstructor';
  return new NormalCompletion(Value.undefined);
}

// 9.2.12 #sec-makemethod
export function MakeMethod(F, homeObject) {
  Assert(F instanceof FunctionValue);
  Assert(Type(homeObject) === 'Object');
  F.HomeObject = homeObject;
  return new NormalCompletion(Value.undefined);
}

// 9.3.3 CreateBuiltinFunction
export function CreateBuiltinFunction(
  steps,
  internalSlotsList,
  realm,
  prototype,
) {
  if (!realm) {
    // If realm is not present, set realm to the current Realm Record.
    realm = surroundingAgent.currentRealmRecord;
  }

  if (!prototype) {
    prototype = realm.Intrinsics['%FunctionPrototype%'];
  }

  // Let func be a new built-in function object that when
  // called performs the action described by steps.
  const func = new Value(steps, realm);

  internalSlotsList.forEach((slot) => {
    func[slot] = undefined;
  });

  func.Realm = realm;
  func.Prototype = prototype;
  func.Extensible = Value.true;
  func.ScriptOrModule = null;

  return func;
}
