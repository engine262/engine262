import { surroundingAgent } from '../engine.mjs';
import {
  CreateBuiltinFunction,
  CreateDataProperty,
  DefinePropertyOrThrow,
  ObjectCreate,
  SetFunctionLength,
  ToString,
} from './all.mjs';
import {
  Descriptor,
  Value,
  wellKnownSymbols,
  ArgumentsExoticObjectValue,
} from '../value.mjs';
import { BoundNames_FormalParameters } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';

// #sec-CreateUnmappedArgumentsObject
export function CreateUnmappedArgumentsObject(argumentsList) {
  const len = argumentsList.length;
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'), ['ParameterMap']);
  obj.ParameterMap = Value.undefined;
  DefinePropertyOrThrow(obj, new Value('length'), Descriptor({
    Value: new Value(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    CreateDataProperty(obj, X(ToString(new Value(index))), val);
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, Descriptor({
    Value: surroundingAgent.intrinsic('%ArrayProto_values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, new Value('callee'), Descriptor({
    Get: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Set: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

function ArgGetterSteps() {
  const f = this;
  const name = f.Name;
  const env = f.Env;
  return env.GetBindingValue(name, Value.false);
}

// #sec-makearggetter
function MakeArgGetter(name, env) {
  const steps = ArgGetterSteps;
  const getter = CreateBuiltinFunction(steps, ['Name', 'Env']);
  getter.Name = name;
  getter.Env = env;
  return getter;
}

function ArgSetterSteps([value]) {
  const f = this;
  const name = f.Name;
  const env = f.Env;
  return env.SetMutableBinding(name, value, Value.false);
}

// #sec-makeargsetter
function MakeArgSetter(name, env) {
  const steps = ArgSetterSteps;
  const setter = CreateBuiltinFunction(steps, ['Name', 'Env']);
  SetFunctionLength(setter, new Value(1));
  setter.Name = name;
  setter.Env = env;
  return setter;
}

// #sec-CreateMappedArgumentsObject
export function CreateMappedArgumentsObject(func, formals, argumentsList, env) {
  // Assert: formals does not contain a rest parameter, any binding
  // patterns, or any initializers. It may contain duplicate identifiers.
  const len = argumentsList.length;
  const obj = new ArgumentsExoticObjectValue();
  obj.Prototype = surroundingAgent.intrinsic('%ObjectPrototype%');
  obj.Extensible = Value.true;
  const map = ObjectCreate(Value.null);
  obj.ParameterMap = map;
  const parameterNames = BoundNames_FormalParameters(formals).map(Value);
  const numberOfParameters = parameterNames.length;
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    CreateDataProperty(obj, X(ToString(new Value(index))), val);
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, new Value('length'), Descriptor({
    Value: new Value(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  const mappedNames = [];
  index = numberOfParameters - 1;
  while (index >= 0) {
    const name = parameterNames[index];
    if (!mappedNames.includes(name)) {
      mappedNames.push(name);
      if (index < len) {
        const g = MakeArgGetter(name, env);
        const p = MakeArgSetter(name, env);
        X(map.DefineOwnProperty(X(ToString(new Value(index))), Descriptor({
          Set: p,
          Get: g,
          Enumerable: Value.false,
          Configurable: Value.true,
        })));
      }
    }
    index -= 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, Descriptor({
    Value: surroundingAgent.intrinsic('%ArrayProto_values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, new Value('callee'), Descriptor({
    Get: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Set: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}
