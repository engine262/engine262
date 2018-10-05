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
  IsExtensible,
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  IsConstructor,
  ToInteger,
  ToObject,
} from './all.mjs';
import {
  FunctionValue,
  Value,
  Type,
  Descriptor,
} from '../value.mjs';
import {
  NormalCompletion, Q, ReturnIfAbrupt,
  X,
  EnsureCompletion,
} from '../completion.mjs';
import {
  ExpectedArgumentCount_ArrowParameters,
  ExpectedArgumentCount_FormalParameters,
} from '../static-semantics/all.mjs';
import {
  EvaluateBody_ConciseBody_Expression,
  EvaluateBody_FunctionBody,
  EvaluateBody_GeneratorBody,
  getFunctionBodyType,
} from '../runtime-semantics/all.mjs';
import {
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  NewFunctionEnvironment,
} from '../environment.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-SetFunctionName
export function SetFunctionName(F, name, prefix) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, new Value('name')).isFalse());
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
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));
}

// #sec-SetFunctionLength
export function SetFunctionLength(F, length) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, new Value('length')).isFalse());
  Assert(Type(length) === 'Number');
  Assert(length.numberValue() >= 0 && X(ToInteger(length)).numberValue() === length.numberValue());
  return X(DefinePropertyOrThrow(F, new Value('length'), Descriptor({
    Value: length,
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));
}

// #sec-PrepareForTailCall
export function PrepareForTailCall() {
  // const leafContext = surroundingAgent.runningExecutionContext;
  // Suspend(leafContext);
  // surroundingAgent.executionContextStack.pop();
  // Assert: leafContext has no further use. It will never
  // be activated as the running execution context.
}

// #sec-prepareforordinarycall
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

// #sec-ecmascript-function-objects-call-thisargument-argumentslist
function FunctionCallSlot(thisArgument, argumentsList) {
  const F = this;

  Assert(F instanceof FunctionValue);
  if (F.FunctionKind === 'classConstructor') {
    return surroundingAgent.Throw('TypeError');
  }

  // const callerContext = surroundingAgent.runningExecutionContext;
  const calleeContext = PrepareForOrdinaryCall(F, new Value(undefined));
  Assert(surroundingAgent.runningExecutionContext === calleeContext);

  OrdinaryCallBindThis(F, calleeContext, thisArgument);
  const { value, done } = OrdinaryCallEvaluateBody(F, argumentsList).next();
  Assert(done);
  const result = EnsureCompletion(value);

  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop();

  if (result.Type === 'return') {
    return new NormalCompletion(result.Value);
  }
  ReturnIfAbrupt(result);
  return new NormalCompletion(new Value(undefined));
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
  const { value, done } = OrdinaryCallEvaluateBody(F, argumentsList).next();
  Assert(done);
  const result = EnsureCompletion(value);

  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop();
  if (result.Type === 'return') {
    if (Type(result.Value) === 'Object') {
      return new NormalCompletion(result.Value);
    }
    if (kind === 'base') {
      return new NormalCompletion(thisArgument);
    }
    if (Type(result.Value) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
  } else {
    ReturnIfAbrupt(result);
  }
  return Q(envRec.GetThisBinding());
}

function OrdinaryCallBindThis(F, calleeContext, thisArgument) {
  const thisMode = F.ThisMode;
  if (thisMode === 'lexical') {
    return new NormalCompletion(new Value(undefined));
  }
  const calleeRealm = F.Realm;
  const localEnv = calleeContext.LexicalEnvironment;
  let thisValue;
  if (thisMode === 'strict') {
    thisValue = thisArgument;
  } else {
    if (Type(thisArgument) === 'Undefined' || Type(thisArgument) === 'Null') {
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

// #sec-ordinarycallevaluatebody
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

    default:
      throw outOfRange('OrdinaryCallEvaluateBody', F.ECMAScriptCode);
  }
}

// #sec-ecmascript-function-objects
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

// #sec-functionallocate
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
    F[internalSlot] = new Value(undefined);
  }
  F.Call = FunctionCallSlot;
  if (needsConstruct) {
    F.Construct = FunctionConstructSlot;
    F.ConstructorKind = 'base';
  }
  F.Strict = strict;
  F.FunctionKind = functionKind;
  F.Prototype = functionPrototype;
  F.Extensible = true;
  F.Realm = surroundingAgent.currentRealmRecord;
  return F;
}

// #sec-functioninitialize
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
      throw outOfRange('FunctionInitialize kind', kind);
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

// #sec-FunctionCreate
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

// #sec-generatorfunctioncreate
export function GeneratorFunctionCreate(kind, ParameterList, Body, Scope, Strict) {
  const functionPrototype = surroundingAgent.intrinsic('%Generator%');
  const F = FunctionAllocate(functionPrototype, Strict, 'generator');
  return FunctionInitialize(F, kind, ParameterList, Body, Scope);
}

// #sec-makeconstructor
export function MakeConstructor(F, writablePrototype, prototype) {
  Assert(F instanceof FunctionValue);
  Assert(IsConstructor(F).isTrue());
  Assert(X(IsExtensible(F)).isTrue() && X(HasOwnProperty(F, new Value('prototype'))).isFalse());
  if (writablePrototype === undefined) {
    writablePrototype = true;
  }
  if (prototype === undefined) {
    prototype = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
    X(DefinePropertyOrThrow(prototype, new Value('constructor'), Descriptor({
      Value: F,
      Writable: new Value(writablePrototype),
      Enumerable: new Value(false),
      Configurable: new Value(true),
    })));
  }
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: new Value(writablePrototype),
    Enumerable: new Value(false),
    Configurable: new Value(false),
  })));
  return new NormalCompletion(new Value(undefined));
}

// #sec-makeclassconstructor
export function MakeClassConstructor(F) {
  Assert(F instanceof FunctionValue);
  Assert(F.FunctionKind === 'normal');
  F.FunctionKind = 'classConstructor';
  return new NormalCompletion(new Value(undefined));
}

// #sec-makemethod
export function MakeMethod(F, homeObject) {
  Assert(F instanceof FunctionValue);
  Assert(Type(homeObject) === 'Object');
  F.HomeObject = homeObject;
  return new NormalCompletion(new Value(undefined));
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
  func.Extensible = true;
  func.ScriptOrModule = null;

  return func;
}
