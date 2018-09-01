import {
  surroundingAgent,
  // Suspend,
  GetActiveScriptOrModule,
  ExecutionContext,
} from '../engine.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  HasOwnProperty,
  IsExtensible,
  OrdinaryCreateFromConstructor,
  ToInteger,
  ToObject,
} from './all.mjs';
import {
  FunctionValue,
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  NormalCompletion, Q, ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import {
  ExpectedArgumentCount_ArrowParameters,
  ExpectedArgumentCount_FormalParameters,
} from '../static-semantics/all.mjs';
import {
  EvaluateBody,
} from '../runtime-semantics/all.mjs';
import {
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  NewFunctionEnvironment,
} from '../environment.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-SetFunctionName
export function SetFunctionName(F, name, prefix) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, NewValue('name')).isFalse());
  Assert(Type(name) === 'Symbol' || Type(name) === 'String');
  Assert(!prefix || Type(prefix) === 'String');
  if (Type(name) === 'Symbol') {
    const description = name.Description;
    if (Type(description) === 'Undefined') {
      name = NewValue('');
    } else {
      name = NewValue(`[${description.stringValue()}]`);
    }
  }
  if (prefix !== undefined) {
    name = NewValue(`${prefix.stringValue()} ${name.stringValue()}`);
  }
  return X(DefinePropertyOrThrow(F, NewValue('name'), {
    Value: name,
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));
}

// #sec-SetFunctionLength
export function SetFunctionLength(F, length) {
  Assert(IsExtensible(F).isTrue() && HasOwnProperty(F, NewValue('length')).isFalse());
  Assert(Type(length) === 'Number');
  Assert(length.numberValue() >= 0 && X(ToInteger(length)).numberValue() === length.numberValue());
  return X(DefinePropertyOrThrow(F, NewValue('length'), {
    Value: length,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));
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
  const calleeContext = PrepareForOrdinaryCall(F, NewValue(undefined));
  Assert(surroundingAgent.runningExecutionContext === calleeContext);

  OrdinaryCallBindThis(F, calleeContext, thisArgument);
  let result = OrdinaryCallEvaluateBody(F, argumentsList);

  // Remove calleeContext from the execution context stack and
  // restore callerContext as the running execution context.
  surroundingAgent.executionContextStack.pop();

  if (result.Type === 'return') {
    return new NormalCompletion(result.Value);
  }
  ReturnIfAbrupt(result);
  return new NormalCompletion(NewValue(undefined));
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
  let result = OrdinaryCallEvaluateBody(F, argumentsList);
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
    return new NormalCompletion(NewValue(undefined));
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
      // NOTE: ToObject produces wrapper objects using calleeRealm.<Paste>
    }
  }
  const envRec = localEnv.EnvironmentRecord;
  Assert(envRec instanceof FunctionEnvironmentRecord);
  Assert(envRec.ThisBindingStatus !== 'initialized');
  return envRec.BindThisValue(thisValue);
}

// #sec-ordinarycallevaluatebody
export function OrdinaryCallEvaluateBody(F, argumentsList) {
  return EvaluateBody(F.ECMAScriptCode, F, argumentsList);
}

function FunctionAllocate(functionPrototype, strict, functionKind) {
  Assert(Type(functionPrototype) === 'Object');
  Assert(['normal', 'non-constructor', 'generator', 'async', 'async generator']
    .includes(functionKind));
  const needsConstruct = functionKind === 'normal';
  if (functionKind === 'non-constructor') {
    functionKind = 'normal';
  }
  const F = new FunctionValue(functionPrototype);
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

function FunctionInitialize(F, kind, ParameterList, Body, Scope) {
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
  X(SetFunctionLength(F, NewValue(len)));
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
export function FunctionCreate(kind, ParameterList, Body, Scope, Strict, prototype) {
  if (prototype === undefined) {
    prototype = surroundingAgent.intrinsic('%FunctionPrototype%');
  }
  const allocKind = kind === 'Normal' ? 'normal' : 'non-constructor';
  const F = FunctionAllocate(prototype, Strict, allocKind);
  return FunctionInitialize(F, kind, ParameterList, Body, Scope);
}
