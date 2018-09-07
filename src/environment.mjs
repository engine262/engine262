import {
  FunctionValue,
  New as NewValue,
  Reference,
  Type,
  wellKnownSymbols,
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
    if (this.bindings.has(N)) {
      return NewValue(true);
    }
    return NewValue(false);
  }

  CreateMutableBinding(N, D) {
    this.bindings.set(N, {
      initialized: false,
      mutable: true,
      strict: undefined,
      deletable: D,
      value: undefined,
    });
  }

  CreateImmutableBinding(N, S) {
    this.bindings.set(N, {
      initialized: false,
      mutable: false,
      strict: S.isTrue(),
      deletable: false,
      value: undefined,
    });
  }

  InitializeBinding(N, V) {
    const binding = this.bindings.get(N);
    Assert(binding !== undefined);
    binding.value = V;
    binding.initialized = true;
  }

  SetMutableBinding(N, V, S) {
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
      S = NewValue(true);
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
    const binding = this.bindings.get(N);
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
    }
    return binding.value;
  }

  DeleteBinding(N) {
    const binding = this.bindings.get(N);
    if (binding.deletable === false) {
      return NewValue(false);
    }

    this.bindings.delete(N);

    return NewValue(true);
  }

  HasThisBinding() {
    return NewValue(false);
  }

  HasSuperBinding() {
    return NewValue(false);
  }

  WithBaseObject() {
    return NewValue(undefined);
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
    const envRec = this;
    const bindings = envRec.bindingObject;

    const foundBinding = Q(HasProperty(bindings, N));
    if (foundBinding.isFalse()) {
      return NewValue(false);
    }

    if (this.withEnvironment === false) {
      return NewValue(true);
    }

    const unscopables = Q(Get(bindings, wellKnownSymbols.unscopables));
    if (Type(unscopables) === 'Object') {
      const blocked = ToBoolean(Q(Get(unscopables, N)));
      if (blocked.isTrue()) {
        return NewValue(false);
      }
    }

    return NewValue(true);
  }

  // 8.1.1.2.2 #sec-object-environment-records-createmutablebinding-n-d
  CreateMutableBinding(N, D) {
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(DefinePropertyOrThrow(bindings, N, {
      Value: NewValue(undefined),
      Writable: true,
      Enumerable: true,
      Configurable: D,
    }));
  }

  // 8.1.1.2.3 #sec-object-environment-records-createimmutablebinding-n-s
  CreateImmutableBinding(/* N, S */) {
    throw new Error('CreateImmutableBinding got called on an object Environment Record');
  }

  // 8.1.1.2.4 #sec-object-environment-records-initializebinding-n-v
  InitializeBinding(N, V) {
    const envRec = this;
    // Record that the binding for N in envRec has been initialized.
    // According to the spec this is an unnecessary step for object Environment Records.
    return Q(envRec.SetMutableBinding(N, V, NewValue(false)));
  }

  // 8.1.1.2.5 #sec-object-environment-records-setmutablebinding-n-v-s
  SetMutableBinding(N, V, S) {
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(Set(bindings, N, V, S));
  }

  // 8.1.1.2.6 #sec-object-environment-records-getbindingvalue-n-s
  GetBindingValue(N, S) {
    const envRec = this;
    const bindings = envRec.bindingObject;
    const value = Q(HasProperty(bindings, N));
    if (value.isFalse()) {
      if (S.isFalse()) {
        return NewValue(undefined);
      } else {
        return surroundingAgent.Throw('ReferenceError', `${N.stringValue()} is not defined`);
      }
    }
    return Q(Get(bindings, N));
  }

  // 8.1.1.2.7 #sec-object-environment-records-deletebinding-n
  DeleteBinding(N) {
    const envRec = this;
    const bindings = envRec.bindingObject;
    return Q(bindings.Delete(N));
  }

  // 8.1.1.2.8 #sec-object-environment-records-hasthisbinding
  HasThisBinding() {
    return NewValue(false);
  }

  // 8.1.1.2.9 #sec-object-environment-records-hassuperbinding
  HasSuperBinding() {
    return NewValue(false);
  }

  // 8.1.1.2.10 #sec-object-environment-records-withbaseobject
  WithBaseObject() {
    const envRec = this;
    if (envRec.withEnvironment) {
      return envRec.bindingObject;
    }
    return NewValue(undefined);
  }
}

export class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
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
      return NewValue(false);
    } else {
      return NewValue(true);
    }
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
      return NewValue(undefined);
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
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return NewValue(true);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.HasBinding(N);
  }

  CreateMutableBinding(N, D) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateMutableBinding(N, D);
  }

  CreateImmutableBinding(N, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateImmutableBinding(N, S);
  }

  InitializeBinding(N, V) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.InitializeBinding(N, V);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.InitializeBinding(N, V);
  }

  SetMutableBinding(N, V, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.SetMutableBinding(N, V, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return Q(ObjRec.SetMutableBinding(N, V, S));
  }

  GetBindingValue(N, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N).isTrue()) {
      return DclRec.GetBindingValue(N, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.GetBindingValue(N, S);
  }

  DeleteBinding(N) {
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
    return NewValue(true);
  }

  HasThisBinding() {
    return NewValue(true);
  }

  HasSuperBinding() {
    return NewValue(false);
  }

  WithBaseObject() {
    return NewValue(false);
  }

  GetThisBinding() {
    const envRec = this;
    return envRec.GlobalThisValue;
  }

  HasVarDeclaration(N) {
    const envRec = this;
    const varDeclaredNames = envRec.VarNames;
    if (varDeclaredNames.has(N)) {
      return NewValue(true);
    }
    return NewValue(false);
  }

  HasLexicalDeclaration(N) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    return DclRec.HasBinding(N);
  }

  HasRestrictedGlobalProperty(N) {
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    if (Type(existingProp) === 'Undefined') {
      return NewValue(false);
    }
    if (existingProp.Configurable) {
      return NewValue(false);
    }
    return NewValue(true);
  }

  CanDeclareGlobalVar(N) {
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    if (hasProperty.isTrue()) {
      return NewValue(true);
    }
    return Q(IsExtensible(globalObject));
  }

  CanDeclareGlobalFunction(N) {
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    if (Type(existingProp) === 'Undefined') {
      return Q(IsExtensible(globalObject));
    }
    if (existingProp.Configurable) {
      return NewValue(true);
    }
    if (IsDataDescriptor(existingProp).isTrue()
        && existingProp.Writable === true
        && existingProp.Enumerable === true) {
      return NewValue(true);
    }
    return NewValue(false);
  }

  CreateGlobalVarBinding(N, D) {
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    const extensible = Q(IsExtensible(globalObject));
    if (hasProperty.isFalse() && extensible.isTrue()) {
      Q(ObjRec.CreateMutableBinding(N, D));
      Q(ObjRec.InitializeBinding(N, NewValue(undefined)));
    }
    const varDeclaredNames = envRec.VarNames;
    if (!varDeclaredNames.has(N)) {
      varDeclaredNames.add(N);
    }
    return new NormalCompletion(undefined);
  }

  CreateGlobalFunctionBinding(N, V, D) {
    const envRec = this;
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = Q(globalObject.GetOwnProperty(N));
    let desc;
    if (Type(existingProp) === 'Undefined' || existingProp.Configurable === true) {
      desc = {
        Value: V,
        Writable: true,
        Enumerable: true,
        Configurable: D,
      };
    } else {
      desc = {
        Value: V,
      };
    }
    Q(DefinePropertyOrThrow(globalObject, N, desc));
    // Record that the binding for N in ObjRec has been initialized.
    Q(Set(globalObject, N, V, NewValue(false)));
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

  env.outerEnvironmentReference = NewValue(null);

  return env;
}

// #sec-getidentifierreference
export function GetIdentifierReference(lex, name, strict) {
  if (Type(lex) === 'Null') {
    return new Reference(NewValue(undefined), name, strict);
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
