import {
  FunctionValue,
  Value,
  Reference,
  Type,
  wellKnownSymbols,
  Descriptor,
} from './value.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  Get,
  HasOwnProperty,
  HasProperty,
  IsDataDescriptor,
  IsExtensible,
  IsPropertyKey,
  Set,
  ToBoolean,
} from './abstract-ops/all.mjs';
import { NormalCompletion, Q } from './completion.mjs';

export class LexicalEnvironment {
  constructor() {
    this.EnvironmentRecord = undefined;
    this.outerEnvironmentReference = undefined;
  }
}

export class EnvironmentRecord {}

// https://tc39.github.io/ecma262/#sec-lexical-environments
export class DeclarativeEnvironmentRecord extends EnvironmentRecord {
  constructor() {
    super();
    this.bindings = new Map();
  }

  HasBinding(N) {
    Assert(IsPropertyKey(N));
    if (this.bindings.has(N)) {
      return new Value(true);
    }
    return new Value(false);
  }

  CreateMutableBinding(N, D) {
    Assert(IsPropertyKey(N));
    this.bindings.set(N, {
      initialized: false,
      mutable: true,
      strict: undefined,
      deletable: D,
      value: undefined,
    });
  }

  CreateImmutableBinding(N, S) {
    Assert(IsPropertyKey(N));
    this.bindings.set(N, {
      initialized: false,
      mutable: false,
      strict: S.isTrue(),
      deletable: false,
      value: undefined,
    });
  }

  InitializeBinding(N, V) {
    Assert(IsPropertyKey(N));
    const binding = this.bindings.get(N);
    Assert(binding !== undefined);
    binding.value = V;
    binding.initialized = true;
  }

  SetMutableBinding(N, V, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    if (!this.bindings.has(N)) {
      if (S.isTrue()) {
        return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
      }
      envRec.CreateMutableBinding(N, true);
      envRec.InitializeBinding(N, V);
      return new NormalCompletion(undefined);
    }

    const binding = this.bindings.get(N);

    if (binding.strict === true) {
      S = new Value(true);
    }

    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
    } else if (binding.mutable === true) {
      binding.value = V;
    } else if (S.isTrue()) {
      return surroundingAgent.Throw('TypeError', 'assignment to a constant variable');
    }
    return new NormalCompletion(undefined);
  }

  GetBindingValue(N) {
    Assert(IsPropertyKey(N));
    const binding = this.bindings.get(N);
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
    }
    return binding.value;
  }

  DeleteBinding(N) {
    Assert(IsPropertyKey(N));
    const binding = this.bindings.get(N);
    if (binding.deletable === false) {
      return new Value(false);
    }

    this.bindings.delete(N);

    return new Value(true);
  }

  HasThisBinding() {
    return new Value(false);
  }

  HasSuperBinding() {
    return new Value(false);
  }

  WithBaseObject() {
    return new Value(undefined);
  }
}

// 8.1.1.2 #sec-object-environment-records
export class ObjectEnvironmentRecord extends EnvironmentRecord {
  constructor(BindingObject) {
    super();
    this.bindingObject = BindingObject;
    this.withEnvironment = false;
  }

  // 8.1.1.2.1 #sec-object-environment-records-hasbinding-n
  HasBinding(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const bindings = envRec.bindingObject;

    const foundBinding = Q(HasProperty(bindings, N));
    if (foundBinding.isFalse()) {
      return new Value(false);
    }

    if (this.withEnvironment === false) {
      return new Value(true);
    }

    const unscopables = Q(Get(bindings, wellKnownSymbols.unscopables));
    if (Type(unscopables) === 'Object') {
      const blocked = ToBoolean(Q(Get(unscopables, N)));
      if (blocked.isTrue()) {
        return new Value(false);
      }
    }

    return new Value(true);
  }

  // 8.1.1.2.2 #sec-object-environment-records-createmutablebinding-n-d
  CreateMutableBinding(N, D) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(DefinePropertyOrThrow(bindings, N, Descriptor({
      Value: new Value(undefined),
      Writable: new Value(true),
      Enumerable: new Value(true),
      Configurable: D,
    })));
  }

  // 8.1.1.2.3 #sec-object-environment-records-createimmutablebinding-n-s
  CreateImmutableBinding(/* N, S */) {
    throw new Error('CreateImmutableBinding got called on an object Environment Record');
  }

  // 8.1.1.2.4 #sec-object-environment-records-initializebinding-n-v
  InitializeBinding(N, V) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    // Record that the binding for N in envRec has been initialized.
    // According to the spec this is an unnecessary step for object Environment Records.
    return Q(envRec.SetMutableBinding(N, V, new Value(false)));
  }

  // 8.1.1.2.5 #sec-object-environment-records-setmutablebinding-n-v-s
  SetMutableBinding(N, V, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(Set(bindings, N, V, S));
  }

  // 8.1.1.2.6 #sec-object-environment-records-getbindingvalue-n-s
  GetBindingValue(N, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const bindings = envRec.bindingObject;
    const value = Q(HasProperty(bindings, N));
    if (value.isFalse()) {
      if (S.isFalse()) {
        return new Value(undefined);
      } else {
        return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
      }
    }
    return Q(Get(bindings, N));
  }

  // 8.1.1.2.7 #sec-object-environment-records-deletebinding-n
  DeleteBinding(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(bindings.Delete(N));
  }

  // 8.1.1.2.8 #sec-object-environment-records-hasthisbinding
  HasThisBinding() {
    return new Value(false);
  }

  // 8.1.1.2.9 #sec-object-environment-records-hassuperbinding
  HasSuperBinding() {
    return new Value(false);
  }

  // 8.1.1.2.10 #sec-object-environment-records-withbaseobject
  WithBaseObject() {
    const envRec = this;
    if (envRec.withEnvironment) {
      return envRec.bindingObject;
    }
    return new Value(undefined);
  }
}

export class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
  constructor() {
    super();
    this.ThisValue = undefined;
    this.ThisBindingValue = undefined;
    this.FunctionObject = undefined;
    this.HomeObject = new Value(undefined);
    this.NewTarget = undefined;
  }

  BindThisValue(V) {
    const envRec = this;
    Assert(envRec.ThisBindingStatus !== 'lexical');
    if (envRec.ThisBindingStatus === 'initialized') {
      return surroundingAgent.Throw('ReferenceError', 'this is not defined');
    }
    envRec.ThisValue = V;
    envRec.ThisBindingStatus = 'initialized';
    return V;
  }

  HasThisBinding() {
    const envRec = this;
    if (envRec.ThisBindingStatus === 'lexical') {
      return new Value(false);
    } else {
      return new Value(true);
    }
  }

  HasSuperBinding() {
    const envRec = this;
    if (envRec.ThisBindingStatus === 'lexical') {
      return new Value(false);
    }
    if (Type(envRec.HomeObject) === 'Undefined') {
      return new Value(false);
    }
    return new Value(true);
  }

  GetThisBinding() {
    const envRec = this;
    Assert(envRec.ThisBindingStatus !== 'lexical');
    if (envRec.ThisBindingStatus === 'uninitialized') {
      return surroundingAgent.Throw('ReferenceError', 'this is not defined');
    }
    return envRec.ThisValue;
  }

  GetSuperBase() {
    const envRec = this;
    const home = envRec.HomeObject;
    if (Type(home) === 'Undefined') {
      return new Value(undefined);
    }
    Assert(Type(home) === 'Object');
    return Q(home.GetPrototypeOf());
  }
}

export class GlobalEnvironmentRecord extends EnvironmentRecord {
  constructor() {
    super();
    this.ObjectRecord = undefined;
    this.GlobalThisValue = undefined;
    this.DeclarativeRecord = undefined;
    this.VarNames = undefined;
  }

  HasBinding(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return new Value(true);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.HasBinding(N);
  }

  CreateMutableBinding(N, D) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateMutableBinding(N, D);
  }

  CreateImmutableBinding(N, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateImmutableBinding(N, S);
  }

  InitializeBinding(N, V) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.InitializeBinding(N, V);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.InitializeBinding(N, V);
  }

  SetMutableBinding(N, V, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.SetMutableBinding(N, V, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return Q(ObjRec.SetMutableBinding(N, V, S));
  }

  GetBindingValue(N, S) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.GetBindingValue(N, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.GetBindingValue(N, S);
  }

  DeleteBinding(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = this.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return Q(DclRec.DeleteBinding(N));
    }
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(HasOwnProperty(globalObject, N));
    if (existingProp.isTrue()) {
      const status = Q(ObjRec.DeleteBinding(N));
      if (status.isTrue()) {
        const varNames = envRec.VarNames;
        if (varNames.has(N)) {
          varNames.delete(N);
        }
      }
      return status;
    }
    return new Value(true);
  }

  HasThisBinding() {
    return new Value(true);
  }

  HasSuperBinding() {
    return new Value(false);
  }

  WithBaseObject() {
    return new Value(false);
  }

  GetThisBinding() {
    const envRec = this;
    return envRec.GlobalThisValue;
  }

  HasVarDeclaration(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const varDeclaredNames = envRec.VarNames;
    if (varDeclaredNames.has(N)) {
      return new Value(true);
    }
    return new Value(false);
  }

  HasLexicalDeclaration(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    return DclRec.HasBinding(N);
  }

  HasRestrictedGlobalProperty(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    if (Type(existingProp) === 'Undefined') {
      return new Value(false);
    }
    if (existingProp.Configurable) {
      return new Value(false);
    }
    return new Value(true);
  }

  CanDeclareGlobalVar(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    if (hasProperty.isTrue()) {
      return new Value(true);
    }
    return Q(IsExtensible(globalObject));
  }

  CanDeclareGlobalFunction(N) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    if (Type(existingProp) === 'Undefined') {
      return Q(IsExtensible(globalObject));
    }
    if (existingProp.Configurable.isrue()) {
      return new Value(true);
    }
    if (IsDataDescriptor(existingProp).isTrue()
        && existingProp.Writable.isTrue()
        && existingProp.Enumerable.isTrue()) {
      return new Value(true);
    }
    return new Value(false);
  }

  CreateGlobalVarBinding(N, D) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    const extensible = Q(IsExtensible(globalObject));
    if (hasProperty.isFalse() && extensible.isTrue()) {
      Q(ObjRec.CreateMutableBinding(N, D));
      Q(ObjRec.InitializeBinding(N, new Value(undefined)));
    }
    const varDeclaredNames = envRec.VarNames;
    if (!varDeclaredNames.has(N)) {
      varDeclaredNames.add(N);
    }
    return new NormalCompletion(undefined);
  }

  CreateGlobalFunctionBinding(N, V, D) {
    Assert(IsPropertyKey(N));
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    let desc;
    if (Type(existingProp) === 'Undefined' || existingProp.Configurable.isTrue()) {
      desc = Descriptor({
        Value: V,
        Writable: new Value(true),
        Enumerable: new Value(true),
        Configurable: D,
      });
    } else {
      desc = Descriptor({
        Value: V,
      });
    }
    Q(DefinePropertyOrThrow(globalObject, N, desc));
    // Record that the binding for N in ObjRec has been initialized.
    Q(Set(globalObject, N, V, new Value(false)));
    const varDeclaredNames = envRec.VarNames;
    if (!varDeclaredNames.has(N)) {
      varDeclaredNames.add(N);
    }
    return new NormalCompletion(undefined);
  }
}

// #sec-newdeclarativeenvironment
export function NewDeclarativeEnvironment(E) {
  const env = new LexicalEnvironment();
  const envRec = new DeclarativeEnvironmentRecord();
  env.EnvironmentRecord = envRec;
  env.outerEnvironmentReference = E;
  return env;
}

// #sec-newobjectenvironment
export function NewObjectEnvironment(O, E) {
  const env = new LexicalEnvironment();
  const envRec = new ObjectEnvironmentRecord(O);
  env.EnvironmentRecord = envRec;
  env.outerEnvironmentReference = E;
  return env;
}

// #sec-newfunctionenvironment
export function NewFunctionEnvironment(F, newTarget) {
  Assert(F instanceof FunctionValue);
  Assert(Type(newTarget) === 'Undefined' || Type(newTarget) === 'Object');
  const env = new LexicalEnvironment();
  const envRec = new FunctionEnvironmentRecord();
  envRec.FunctionObject = F;
  if (F.ThisMode === 'lexical') {
    envRec.ThisBindingStatus = 'lexical';
  } else {
    envRec.ThisBindingStatus = 'uninitialized';
  }
  const home = F.HomeObject;
  envRec.HomeObject = home;
  envRec.NewTarget = newTarget;
  env.EnvironmentRecord = envRec;
  env.outerEnvironmentReference = F.Environment;
  return env;
}

// 8.1.2.5 NewGlobalEnvironment
export function NewGlobalEnvironment(G, thisValue) {
  const env = new LexicalEnvironment();
  const objRec = new ObjectEnvironmentRecord(G);
  const dclRec = new DeclarativeEnvironmentRecord();
  const globalRec = new GlobalEnvironmentRecord();

  globalRec.ObjectRecord = objRec;
  globalRec.GlobalThisValue = thisValue;
  globalRec.DeclarativeRecord = dclRec;
  globalRec.VarNames = new global.Set();

  env.EnvironmentRecord = globalRec;

  env.outerEnvironmentReference = new Value(null);

  return env;
}

// #sec-getidentifierreference
export function GetIdentifierReference(lex, name, strict) {
  if (Type(lex) === 'Null') {
    return new Reference(new Value(undefined), name, strict);
  }
  const envRec = lex.EnvironmentRecord;
  const exists = envRec.HasBinding(name);
  if (exists.isTrue()) {
    return new Reference(envRec, name, strict);
  } else {
    const outer = lex.outerEnvironmentReference;
    return GetIdentifierReference(outer, name, strict);
  }
}
