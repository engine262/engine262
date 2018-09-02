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
  New as NewValue,
  wellKnownSymbols,
  ArgumentsExoticObjectValue,
} from '../value.mjs';
import { BoundNames_FormalParameterList } from '../static-semantics/all.mjs';
import { X } from '../completion.mjs';

// #sec-CreateUnmappedArgumentsObject
export function CreateUnmappedArgumentsObject(argumentsList) {
  const len = argumentsList.length;
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'), ['ParameterMap']);
  obj.ParameterMap = NewValue(undefined);
  DefinePropertyOrThrow(obj, NewValue('length'), {
    Value: NewValue(len),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    CreateDataProperty(obj, X(ToString(NewValue(index)), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, {
    Value: surroundingAgent.intrinsic('%ArrayProto_values%'),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  }));
  X(DefinePropertyOrThrow(obj, NewValue('callee'), {
    Get: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Set: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Eumerable: false,
    Configurable: false,
  }));
  return obj;
}

function ArgGetterSteps() {
  const f = this;
  const name = f.Name;
  const env = f.Env;
  return env.GetBindingValue(name, NewValue(false));
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
  return env.SetMutableBinding(name, value, NewValue(false));
}

// #sec-makeargsetter
function MakeArgSetter(name, env) {
  const steps = ArgSetterSteps;
  const setter = CreateBuiltinFunction(steps, ['Name', 'Env']);
  SetFunctionLength(setter, NewValue(1));
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
  obj.Extensible = true;
  const map = ObjectCreate(NewValue(null));
  obj.ParameterMap = map;
  const parameterNames = BoundNames_FormalParameterList(formals).map(NewValue);
  const numberOfParameters = parameterNames.length;
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    CreateDataProperty(obj, X(ToString(NewValue(index))), val);
    index += 1;
  }
  DefinePropertyOrThrow(obj, NewValue('length'), {
    Value: NewValue(len),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  const mappedNames = [];
  index = numberOfParameters - 1;
  while (index >= 0) {
    const name = parameterNames[index];
    if (!mappedNames.includes(name)) {
      mappedNames.push(name);
      if (index < len) {
        const g = MakeArgGetter(name, env);
        const p = MakeArgSetter(name, env);
        map.DefineOwnProperty(X(ToString(NewValue(index))), {
          Set: p,
          Get: g,
          Enumerable: false,
          Configurable: true,
        });
      }
    }
    index -= 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, {
    Value: surroundingAgent.intrinsic('%ArrayProto_values%'),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  }));
  X(DefinePropertyOrThrow(obj, NewValue('callee'), {
    Get: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Set: surroundingAgent.intrinsic('%ThrowTypeError%'),
    Eumerable: false,
    Configurable: false,
  }));
  return obj;
}
