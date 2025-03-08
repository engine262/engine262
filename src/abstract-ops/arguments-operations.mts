import { surroundingAgent } from '../engine.mts';
import {
  Descriptor,
  JSStringValue,
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type ObjectInternalMethods,
} from '../value.mts';
import { BoundNames } from '../static-semantics/all.mts';
import { Q, X } from '../completion.mts';
import { JSStringSet, type Mutable } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import {
  Assert,
  CreateBuiltinFunction,
  CreateDataProperty,
  DefinePropertyOrThrow,
  ToString,
  SameValue,
  MakeBasicObject,
  OrdinaryObjectCreate,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  OrdinaryGet,
  OrdinarySet,
  OrdinaryDelete,
  Get,
  Set,
  HasOwnProperty,
  IsAccessorDescriptor,
  IsDataDescriptor,
  F,
  type OrdinaryObject,
  type FunctionObject,
} from './all.mts';
import type { EnvironmentRecord } from '#self';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-arguments-exotic-objects */
export interface MappedArgumentsObject extends OrdinaryObject {
  readonly ParameterMap: ObjectValue;
}
export interface UnmappedArgumentsObject extends OrdinaryObject {
  readonly ParameterMap: UndefinedValue;
}

const ArgumentExoticObject = {
  GetOwnProperty(P) {
    const args = this;
    const desc = OrdinaryGetOwnProperty(args, P);
    if (desc === Value.undefined) {
      return desc;
    }
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped === Value.true) {
      return Descriptor({ ...desc, Value: Q(Get(map, P)) });
    }
    return desc;
  },
  DefineOwnProperty(P, Desc) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    let newArgDesc = Desc;
    if (isMapped === Value.true && IsDataDescriptor(Desc) === true) {
      if (Desc.Value === undefined && Desc.Writable !== undefined && Desc.Writable === Value.false) {
        newArgDesc = Descriptor({ ...Desc, Value: X(Get(map, P)) });
      }
    }
    const allowed = Q(OrdinaryDefineOwnProperty(args, P, newArgDesc));
    if (allowed === Value.false) {
      return Value.false;
    }
    if (isMapped === Value.true) {
      if (IsAccessorDescriptor(Desc) === true) {
        map.Delete(P);
      } else {
        if (Desc.Value !== undefined) {
          const setStatus = Set(map, P, Desc.Value, Value.false);
          Assert(setStatus === Value.true);
        }
        if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
          map.Delete(P);
        }
      }
    }
    return Value.true;
  },
  Get(P, Receiver) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped === Value.false) {
      return Q(OrdinaryGet(args, P, Receiver));
    } else {
      return Get(map, P);
    }
  },
  Set(P, V, Receiver) {
    const args = this;
    let isMapped;
    let map;
    if (SameValue(args, Receiver) === Value.false) {
      isMapped = false;
    } else {
      map = args.ParameterMap;
      isMapped = X(HasOwnProperty(map, P)) === Value.true;
    }
    if (isMapped) {
      const setStatus = Set(map!, P, V, Value.false);
      Assert(setStatus === Value.true);
    }
    return Q(OrdinarySet(args, P, V, Receiver));
  },
  Delete(P) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    const result = Q(OrdinaryDelete(args, P));
    if (result === Value.true && isMapped === Value.true) {
      map.Delete(P);
    }
    return result;
  },
} satisfies Partial<ObjectInternalMethods<MappedArgumentsObject>>;

/** https://tc39.es/ecma262/#sec-createunmappedargumentsobject */
export function CreateUnmappedArgumentsObject(argumentsList: Arguments) {
  const len = argumentsList.length;
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'), ['ParameterMap']) as Mutable<UnmappedArgumentsObject>;
  obj.ParameterMap = Value.undefined;
  DefinePropertyOrThrow(obj, Value('length'), Descriptor({
    Value: F(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    X(CreateDataProperty(obj, X(ToString(F(index))), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, wellKnownSymbols.iterator, Descriptor({
    Value: surroundingAgent.intrinsic('%Array.prototype.values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, Value('callee'), Descriptor({
    Get: surroundingAgent.intrinsic('%ThrowTypeError%') as FunctionObject,
    Set: surroundingAgent.intrinsic('%ThrowTypeError%') as FunctionObject,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return obj;
}

/** https://tc39.es/ecma262/#sec-makearggetter */
function MakeArgGetter(name: JSStringValue, env: EnvironmentRecord) {
  // 1. Let getterClosure be a new Abstract Closure with no parameters that captures name and env and performs the following steps when called:
  //   a. Return env.GetBindingValue(name, false).
  const getterClosure = () => env.GetBindingValue(name, Value.false);
  // 2. Let getter be ! CreateBuiltinFunction(getterClosure, 0, "", « »).
  const getter = X(CreateBuiltinFunction(getterClosure, 0, Value(''), ['Name', 'Env']));
  // 3. NOTE: getter is never directly accessible to ECMAScript code.
  // 4. Return getter.
  return getter;
}

/** https://tc39.es/ecma262/#sec-makeargsetter */
function MakeArgSetter(name: JSStringValue, env: EnvironmentRecord) {
  // 1. Let setterClosure be a new Abstract Closure with parameters (value) that captures name and env and performs the following steps when called:
  //   a. Return env.SetMutableBinding(name, value, false).
  const setterClosure = ([value = Value.undefined]: Arguments) => env.SetMutableBinding(name, value, Value.false);
  // 2. Let setter be ! CreateBuiltinFunction(setterClosure, 1, "", « »).
  const setter = X(CreateBuiltinFunction(setterClosure, 1, Value(''), ['Name', 'Env']));
  // 3. NOTE: setter is never directly accessible to ECMAScript code.
  // 4. Return setter.
  return setter;
}

/** https://tc39.es/ecma262/#sec-createmappedargumentsobject */
export function CreateMappedArgumentsObject(func: ObjectValue, formals: ParseNode.FormalParameters, argumentsList: Arguments, env: EnvironmentRecord) {
  // Assert: formals does not contain a rest parameter, any binding
  // patterns, or any initializers. It may contain duplicate identifiers.
  const len = argumentsList.length;
  const obj = X(MakeBasicObject(['Prototype', 'Extensible', 'ParameterMap']));
  obj.GetOwnProperty = ArgumentExoticObject.GetOwnProperty;
  obj.DefineOwnProperty = ArgumentExoticObject.DefineOwnProperty;
  obj.Get = ArgumentExoticObject.Get;
  obj.Set = ArgumentExoticObject.Set;
  obj.Delete = ArgumentExoticObject.Delete;
  obj.Prototype = surroundingAgent.intrinsic('%Object.prototype%');
  const map = OrdinaryObjectCreate(Value.null);
  obj.ParameterMap = map;
  const parameterNames = BoundNames(formals);
  const numberOfParameters = parameterNames.length;
  let index = 0;
  while (index < len) {
    const val = argumentsList[index];
    X(CreateDataProperty(obj, X(ToString(F(index))), val));
    index += 1;
  }
  X(DefinePropertyOrThrow(obj, Value('length'), Descriptor({
    Value: F(len),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  const mappedNames = new JSStringSet();
  index = numberOfParameters - 1;
  while (index >= 0) {
    const name = parameterNames[index];
    if (!mappedNames.has(name)) {
      mappedNames.add(name);
      if (index < len) {
        const g = MakeArgGetter(name, env);
        const p = MakeArgSetter(name, env);
        X(map.DefineOwnProperty(X(ToString(F(index))), Descriptor({
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
    Value: surroundingAgent.intrinsic('%Array.prototype.values%'),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(obj, Value('callee'), Descriptor({
    Value: func,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  return obj;
}
