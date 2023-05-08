// @ts-nocheck
import { AbstractModuleRecord } from './modules.mjs';
import {
  Descriptor,
  ReferenceRecord,
  UndefinedValue,
  ObjectValue,
  Value,
  wellKnownSymbols,
} from './value.mjs';
import { surroundingAgent } from './engine.mjs';
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
  isECMAScriptFunctionObject,
} from './abstract-ops/all.mjs';
import { NormalCompletion, Q, X } from './completion.mjs';
import { ValueMap } from './helpers.mjs';

/** https://tc39.es/ecma262/#sec-environment-records */
export class EnvironmentRecord {
  OuterEnv;

  // NON-SPEC
  mark(m) {
    m(this.OuterEnv);
  }
}

/** https://tc39.es/ecma262/#sec-declarative-environment-records */
export class DeclarativeEnvironmentRecord extends EnvironmentRecord {
  bindings = new ValueMap();

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-hasbinding-n */
  HasBinding(N) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. If envRec has a binding for the name that is the value of N, return true.
    if (envRec.bindings.has(N)) {
      return Value.true;
    }
    // 3. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-createmutablebinding-n-d */
  CreateMutableBinding(N, D) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec does not already have a binding for N.
    Assert(!envRec.bindings.has(N));
    // 3. Create a mutable binding in envRec for N and record that it is uninitialized. If D
    //    is true, record that the newly created binding may be deleted by a subsequent
    //    DeleteBinding call.
    this.bindings.set(N, {
      indirect: false,
      initialized: false,
      mutable: true,
      strict: undefined,
      deletable: D === Value.true,
      value: undefined,
      mark(m) {
        m(this.value);
      },
    });
    //  4. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-createimmutablebinding-n-s */
  CreateImmutableBinding(N, S) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec does not already have a binding for N.
    Assert(!envRec.bindings.has(N));
    // 3. Create an immutable binding in envRec for N and record that it is uninitialized. If
    //    S is true, record that the newly created binding is a strict binding.
    this.bindings.set(N, {
      indirect: false,
      initialized: false,
      mutable: false,
      strict: S === Value.true,
      deletable: false,
      value: undefined,
      mark(m) {
        m(this.value);
      },
    });
    // 4. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-initializebinding-n-v */
  InitializeBinding(N, V) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec must have an uninitialized binding for N.
    const binding = envRec.bindings.get(N);
    Assert(binding !== undefined && binding.initialized === false);
    // 3. Set the bound value for N in envRec to V.
    binding.value = V;
    // 4. Record that the binding for N in envRec has been initialized.
    binding.initialized = true;
    // 5. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-setmutablebinding-n-v-s */
  SetMutableBinding(N, V, S) {
    Assert(IsPropertyKey(N));
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. If envRec does not have a binding for N, then
    if (!envRec.bindings.has(N)) {
      // a. If S is true, throw a ReferenceError exception.
      if (S === Value.true) {
        return surroundingAgent.Throw('ReferenceError', 'NotDefined', N);
      }
      // b. Perform envRec.CreateMutableBinding(N, true).
      envRec.CreateMutableBinding(N, Value.true);
      // c. Perform envRec.InitializeBinding(N, V).
      envRec.InitializeBinding(N, V);
      // d. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    }
    const binding = this.bindings.get(N);
    // 3. If the binding for N in envRec is a strict binding, set S to true.
    if (binding.strict === true) {
      S = Value.true;
    }
    // 4. If the binding for N in envRec has not yet been initialized, throw a ReferenceError exception.
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', 'NotInitialized', N);
    }
    // 5. Else if the binding for N in envRec is a mutable binding, change its bound value to V.
    if (binding.mutable === true) {
      binding.value = V;
    } else {
      // a. Assert: This is an attempt to change the value of an immutable binding.
      // b. If S is true, throw a TypeError exception.
      if (S === Value.true) {
        return surroundingAgent.Throw('TypeError', 'AssignmentToConstant', N);
      }
    }
    // 7. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-getbindingvalue-n-s */
  GetBindingValue(N) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec has a binding for N.
    const binding = envRec.bindings.get(N);
    Assert(binding !== undefined);
    // 3. If the binding for N in envRec is an uninitialized binding, throw a ReferenceError exception.
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', 'NotInitialized', N);
    }
    // 4. Return the value currently bound to N in envRec.
    return binding.value;
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-deletebinding-n */
  DeleteBinding(N) {
    // 1. Let envRec be the declarative Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec has a binding for the name that is the value of N.
    const binding = envRec.bindings.get(N);
    Assert(binding !== undefined);
    // 3. If the binding for N in envRec cannot be deleted, return false.
    if (binding.deletable === false) {
      return Value.false;
    }
    // 4. Remove the binding for N from envRec.
    envRec.bindings.delete(N);
    // 5. Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-hasthisbinding */
  HasThisBinding() {
    // 1. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-hassuperbinding */
  HasSuperBinding() {
    // 1. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-declarative-environment-records-withbaseobject */
  WithBaseObject() {
    // 1. Return undefined.
    return Value.undefined;
  }

  // NON-SPEC
  mark(m) {
    m(this.bindings);
  }
}

/** https://tc39.es/ecma262/#sec-object-environment-records */
export class ObjectEnvironmentRecord extends EnvironmentRecord {
  BindingObject;
  IsWithEnvironment;

  /** https://tc39.es/ecma262/#sec-object-environment-records-hasbinding-n */
  HasBinding(N) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let bindings be the binding object for envRec.
    const bindings = envRec.BindingObject;
    // 3. Let foundBinding be ? HasProperty(bindings, N).
    const foundBinding = Q(HasProperty(bindings, N));
    // 4. If foundBinding is false, return false.
    if (foundBinding === Value.false) {
      return Value.false;
    }
    // 5. If the IsWithEnvironment flag of envRec i s false, return true.
    if (envRec.IsWithEnvironment === Value.false) {
      return Value.true;
    }
    // 6. Let unscopables be ? Get(bindings, @@unscopables).
    const unscopables = Q(Get(bindings, wellKnownSymbols.unscopables));
    // 7. If Type(unscopables) is Object, then
    if (unscopables instanceof ObjectValue) {
      // a. Let blocked be ! ToBoolean(? Get(unscopables, N)).
      const blocked = X(ToBoolean(Q(Get(unscopables, N))));
      // b. If blocked is true, return false.
      if (blocked === Value.true) {
        return Value.false;
      }
    }
    // 8. Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-createmutablebinding-n-d */
  CreateMutableBinding(N, D) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let envRec be the object Environment Record for which the method was invoked.
    const bindings = envRec.BindingObject;
    // 3. Return ? DefinePropertyOrThrow(bindings, N, PropertyDescriptor { [[Value]]: undefined, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: D }).
    return Q(DefinePropertyOrThrow(bindings, N, Descriptor({
      Value: Value.undefined,
      Writable: Value.true,
      Enumerable: Value.true,
      Configurable: D,
    })));
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-createimmutablebinding-n-s */
  CreateImmutableBinding(_N, _S) {
    Assert(false, 'CreateImmutableBinding called on an Object Environment Record');
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-initializebinding-n-v */
  InitializeBinding(N, V) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec must have an uninitialized binding for N.
    // 3. Record that the binding for N in envRec has been initialized.
    // 4. Return ? envRec.SetMutableBinding(N, V, false).
    return Q(envRec.SetMutableBinding(N, V, Value.false));
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-setmutablebinding-n-v-s */
  SetMutableBinding(N, V, S) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let bindings be the binding object for envRec.
    const bindings = envRec.BindingObject;
    // 3. Let stillExists be ? HasProperty(bindings, N).
    const stillExists = Q(HasProperty(bindings, N));
    // 4. If stillExists is false and S is true, throw a ReferenceError exception.
    if (stillExists === Value.false && S === Value.true) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', N);
    }
    // 5. Return ? Set(bindings, N, V, S).
    return Q(Set(bindings, N, V, S));
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-getbindingvalue-n-s */
  GetBindingValue(N, S) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let bindings be the binding object for envRec.
    const bindings = envRec.BindingObject;
    // 3. Let value be ? HasProperty(bindings, N).
    const value = Q(HasProperty(bindings, N));
    // 4. If value is false, then
    if (value === Value.false) {
      // a. If S is false, return the value undefined; otherwise throw a ReferenceError exception.
      if (S === Value.false) {
        return Value.undefined;
      } else {
        return surroundingAgent.Throw('ReferenceError', 'NotDefined', N);
      }
    }
    // 5. Return ? Get(bindings, N).
    return Q(Get(bindings, N));
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-deletebinding-n */
  DeleteBinding(N) {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let bindings be the binding object for envRec.
    const bindings = envRec.BindingObject;
    // 3. Return ? bindings.[[Delete]](N).
    return Q(bindings.Delete(N));
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-hasthisbinding */
  HasThisBinding() {
    // 1. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-hassuperbinding */
  HasSuperBinding() {
    // 1. Return falase.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-object-environment-records-withbaseobject */
  WithBaseObject() {
    // 1. Let envRec be the object Environment Record for which the method was invoked.
    const envRec = this;
    // 2. If the IsWithEnvironment flag of envRec is true, return the binding object for envRec.
    if (envRec.IsWithEnvironment === Value.true) {
      return envRec.BindingObject;
    }
    // 3. Otherwise, return undefined.
    return Value.undefined;
  }

  // NON-SPEC
  mark(m) {
    m(this.BindingObject);
  }
}

/** https://tc39.es/ecma262/#sec-function-environment-records */
export class FunctionEnvironmentRecord extends DeclarativeEnvironmentRecord {
  ThisValue;
  ThisBindingStatus;
  FunctionObject;
  NewTarget;

  /** https://tc39.es/ecma262/#sec-bindthisvalue */
  BindThisValue(V) {
    // 1. Let envRec be the function Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec.[[ThisBindingStatus]] is not lexical.
    Assert(envRec.ThisBindingStatus !== 'lexical');
    // 3. If envRec.[[ThisBindingStatus]] is initialized, throw a ReferenceError exception.
    if (envRec.ThisBindingStatus === 'initialized') {
      return surroundingAgent.Throw('ReferenceError', 'InvalidThis');
    }
    // 4. Set envRec.[[ThisValue]] to V.
    envRec.ThisValue = V;
    // 5. Set envRec.[[ThisBindingStatus]] to initialized.
    envRec.ThisBindingStatus = 'initialized';
    // 6. Return V.
    return V;
  }

  /** https://tc39.es/ecma262/#sec-function-environment-records-hasthisbinding */
  HasThisBinding() {
    // 1. Let envRec be the function Environment Record for which the method was invoked.
    const envRec = this;
    // 2. If envRec.[[ThisBindingStatus]] is lexical, return false; otherwise, return true.
    if (envRec.ThisBindingStatus === 'lexical') {
      return Value.false;
    } else {
      return Value.true;
    }
  }

  /** https://tc39.es/ecma262/#sec-function-environment-records-hassuperbinding */
  HasSuperBinding() {
    const envRec = this;
    // 1. If envRec.[[ThisBindingStatus]] is lexical, return false.
    if (envRec.ThisBindingStatus === 'lexical') {
      return Value.false;
    }
    // 2. If envRec.[[FunctionObject]].[[HomeObject]] has the value undefined, return false; otherwise, return true.
    if (envRec.FunctionObject.HomeObject === Value.undefined) {
      return Value.false;
    } else {
      return Value.true;
    }
  }

  /** https://tc39.es/ecma262/#sec-function-environment-records-getthisbinding */
  GetThisBinding() {
    // 1. Let envRec be the function Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec.[[ThisBindingStatus]] is not lexical.
    Assert(envRec.ThisBindingStatus !== 'lexical');
    // 3. If envRec.[[ThisBindingStatus]] is uninitialized, throw a ReferenceError exception.
    if (envRec.ThisBindingStatus === 'uninitialized') {
      return surroundingAgent.Throw('ReferenceError', 'InvalidThis');
    }
    // 4. Return envRec.[[ThisValue]].
    return envRec.ThisValue;
  }

  /** https://tc39.es/ecma262/#sec-getsuperbase */
  GetSuperBase() {
    const envRec = this;
    // 1. Let home be envRec.[[FunctionObject]].[[HomeObject]].
    const home = envRec.FunctionObject.HomeObject;
    // 2. If home has the value undefined, return undefined.
    if (home === Value.undefined) {
      return Value.undefined;
    }
    // 3. Assert: Type(home) is Object.
    Assert(home instanceof ObjectValue);
    // 4. Return ? home.[[GetPrototypeOf]]().
    return Q(home.GetPrototypeOf());
  }

  mark(m) {
    super.mark(m);
    m(this.ThisValue);
    m(this.FunctionObject);
    m(this.NewTarget);
  }
}

/** https://tc39.es/ecma262/#sec-global-environment-records */
export class GlobalEnvironmentRecord extends EnvironmentRecord {
  ObjectRecord;
  GlobalThisValue;
  DeclarativeRecord;
  VarNames;

  /** https://tc39.es/ecma262/#sec-global-environment-records-hasbinding-n */
  HasBinding(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, return true.
    if (DclRec.HasBinding(N) === Value.true) {
      return Value.true;
    }
    // 4. If DclRec.HasBinding(N) is true, return true.
    const ObjRec = envRec.ObjectRecord;
    // 5. Let ObjRec be envRec.[[ObjectRecord]].
    return ObjRec.HasBinding(N);
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-createmutablebinding-n-d */
  CreateMutableBinding(N, D) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, throw a TypeError exception.
    if (DclRec.HasBinding(N) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', N);
    }
    // 4. Return DclRec.CreateMutableBinding(N, D).
    return DclRec.CreateMutableBinding(N, D);
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-createimmutablebinding-n-s */
  CreateImmutableBinding(N, S) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, throw a TypeError exception.
    if (DclRec.HasBinding(N) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'AlreadyDeclared', N);
    }
    // Return DclRec.CreateImmutableBinding(N, S).
    return DclRec.CreateImmutableBinding(N, S);
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-initializebinding-n-v */
  InitializeBinding(N, V) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, then
    if (DclRec.HasBinding(N) === Value.true) {
      // a. Return DclRec.InitializeBinding(N, V).
      return DclRec.InitializeBinding(N, V);
    }
    // 4. Assert: If the binding exists, it must be in the object Environment Record.
    // 5. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 6. Return ? ObjRec.InitializeBinding(N, V).
    return ObjRec.InitializeBinding(N, V);
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-setmutablebinding-n-v-s */
  SetMutableBinding(N, V, S) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, then
    if (DclRec.HasBinding(N) === Value.true) {
      // a. Return DclRec.SetMutableBinding(N, V, S).
      return DclRec.SetMutableBinding(N, V, S);
    }
    // 4. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 5. Return ? ObjRec.SetMutableBinding(N, V, S).
    return Q(ObjRec.SetMutableBinding(N, V, S));
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-getbindingvalue-n-s */
  GetBindingValue(N, S) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = envRec.DeclarativeRecord;
    // 3. If DclRec.HasBinding(N) is true, then
    if (DclRec.HasBinding(N) === Value.true) {
      // a. Return DclRec.GetBindingValue(N, S).
      return DclRec.GetBindingValue(N, S);
    }
    // 4. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 5. Return ? ObjRec.GetBindingValue(N, S).
    return Q(ObjRec.GetBindingValue(N, S));
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-deletebinding-n */
  DeleteBinding(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let DclRec be envRec.[[DeclarativeRecord]].
    const DclRec = this.DeclarativeRecord;
    // 3. Let DclRec be envRec.[[DeclarativeRecord]].
    if (DclRec.HasBinding(N) === Value.true) {
      // a. Return DclRec.DeleteBinding(N).
      return Q(DclRec.DeleteBinding(N));
    }
    // 4. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 5. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 6. Let existingProp be ? HasOwnProperty(globalObject, N).
    const existingProp = Q(HasOwnProperty(globalObject, N));
    // 7. If existingProp is true, then
    if (existingProp === Value.true) {
      // a. Let status be ? ObjRec.DeleteBinding(N).
      const status = Q(ObjRec.DeleteBinding(N));
      // b. If status is true, then
      if (status === Value.true) {
        // i. Let varNames be envRec.[[VarNames]].
        const varNames = envRec.VarNames;
        // ii. If N is an element of varNames, remove that element from the varNames.
        const i = varNames.findIndex((v) => v.stringValue() === N.stringValue());
        if (i >= 0) {
          varNames.splice(i, 1);
        }
      }
      // c. Return status.
      return status;
    }
    // 8. Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-hasthisbinding */
  HasThisBinding() {
    // Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-hassuperbinding */
  HasSuperBinding() {
    // 1. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-withbaseobject */
  WithBaseObject() {
    // 1. Return undefined.
    return Value.undefined;
  }

  /** https://tc39.es/ecma262/#sec-global-environment-records-getthisbinding */
  GetThisBinding() {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Return envRec.[[GlobalThisValue]].
    return envRec.GlobalThisValue;
  }

  /** https://tc39.es/ecma262/#sec-hasvardeclaration */
  HasVarDeclaration(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let varDeclaredNames be envRec.[[VarNames]].
    const varDeclaredNames = envRec.VarNames;
    // 3. If varDeclaredNames contains N, return true.
    if (varDeclaredNames.some((v) => v.stringValue() === N.stringValue())) {
      return Value.true;
    }
    // 4. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-haslexicaldeclaration */
  HasLexicalDeclaration(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let envRec be the global Environment Record for which the method was invoked.
    const DclRec = envRec.DeclarativeRecord;
    // 3. Let DclRec be envRec.[[DeclarativeRecord]].
    return DclRec.HasBinding(N);
  }

  /** https://tc39.es/ecma262/#sec-hasrestrictedglobalproperty */
  HasRestrictedGlobalProperty(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 3. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 4. Let existingProp be ? globalObject.[[GetOwnProperty]](N).
    const existingProp = Q(globalObject.GetOwnProperty(N));
    // 5. If existingProp is undefined, return false.
    if (existingProp === Value.undefined) {
      return Value.false;
    }
    // 6. If existingProp.[[Configurable]] is true, return false.
    if (existingProp.Configurable === Value.true) {
      return Value.false;
    }
    // Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-candeclareglobalvar */
  CanDeclareGlobalVar(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 3. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 4. Let hasProperty be ? HasOwnProperty(globalObject, N).
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    // 5. If hasProperty is true, return true.
    if (hasProperty === Value.true) {
      return Value.true;
    }
    // 6. Return ? IsExtensible(globalObject).
    return Q(IsExtensible(globalObject));
  }

  /** https://tc39.es/ecma262/#sec-candeclareglobalfunction */
  CanDeclareGlobalFunction(N) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 3. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 4. Let existingProp be ? globalObject.[[GetOwnProperty]](N).
    const existingProp = Q(globalObject.GetOwnProperty(N));
    // 5. If existingProp is undefined, return ? IsExtensible(globalObject).
    if (existingProp === Value.undefined) {
      return Q(IsExtensible(globalObject));
    }
    // 6. If existingProp.[[Configurable]] is true, return true.
    if (existingProp.Configurable === Value.true) {
      return Value.true;
    }
    // 7. If IsDataDescriptor(existingProp) is true and existingProp has attribute values
    //    { [[Writable]]: true, [[Enumerable]]: true }, return true.
    if (IsDataDescriptor(existingProp) === true
        && existingProp.Writable === Value.true
        && existingProp.Enumerable === Value.true) {
      return Value.true;
    }
    // 8. Return false.
    return Value.false;
  }

  /** https://tc39.es/ecma262/#sec-createglobalvarbinding */
  CreateGlobalVarBinding(N, D) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 3. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 4. Let hasProperty be ? HasOwnProperty(globalObject, N).
    const hasProperty = Q(HasOwnProperty(globalObject, N));
    // 5. Let extensible be ? IsExtensible(globalObject).
    const extensible = Q(IsExtensible(globalObject));
    // 6. If hasProperty is false and extensible is true, then
    if (hasProperty === Value.false && extensible === Value.true) {
      // a. Perform ? ObjRec.CreateMutableBinding(N, D).
      Q(ObjRec.CreateMutableBinding(N, D));
      // b. Perform ? ObjRec.InitializeBinding(N, undefined).
      Q(ObjRec.InitializeBinding(N, Value.undefined));
    }
    // 7. Let varDeclaredNames be envRec.[[VarNames]].
    const varDeclaredNames = envRec.VarNames;
    // 8. If varDeclaredNames does not contain N, then
    if (!varDeclaredNames.some((v) => v.stringValue() === N.stringValue())) {
      // a. Append N to varDeclaredNames.
      varDeclaredNames.push(N);
    }
    // return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  /** https://tc39.es/ecma262/#sec-createglobalfunctionbinding */
  CreateGlobalFunctionBinding(N, V, D) {
    // 1. Let envRec be the global Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Let ObjRec be envRec.[[ObjectRecord]].
    const ObjRec = envRec.ObjectRecord;
    // 3. Let globalObject be the binding object for ObjRec.
    const globalObject = ObjRec.BindingObject;
    // 4. Let existingProp be ? globalObject.[[GetOwnProperty]](N).
    const existingProp = Q(globalObject.GetOwnProperty(N));
    // 5. If existingProp is undefined or existingProp.[[Configurable]] is true, then
    let desc;
    if (existingProp === Value.undefined || existingProp.Configurable === Value.true) {
      // a. Let desc be the PropertyDescriptor { [[Value]]: V, [[Writable]]: true, [[Enumerable]]: true, [[Configurable]]: D }.
      desc = Descriptor({
        Value: V,
        Writable: Value.true,
        Enumerable: Value.true,
        Configurable: D,
      });
    } else {
      // a. Let desc be the PropertyDescriptor { [[Value]]: V }.
      desc = Descriptor({
        Value: V,
      });
    }
    // 7. Perform ? DefinePropertyOrThrow(globalObject, N, desc).
    Q(DefinePropertyOrThrow(globalObject, N, desc));
    // 8. Record that the binding for N in ObjRec has been initialized.
    // 9. Perform ? Set(globalObject, N, V, false).
    Q(Set(globalObject, N, V, Value.false));
    // 10. Let varDeclaredNames be envRec.[[VarNames]].
    const varDeclaredNames = envRec.VarNames;
    // 11. If varDeclaredNames does not contain N, then
    if (!varDeclaredNames.some((v) => v.stringValue() === N.stringValue())) {
      // a. Append N to varDeclaredNames.
      varDeclaredNames.push(N);
    }
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  mark(m) {
    m(this.ObjectRecord);
    m(this.GlobalThisValue);
    m(this.DeclarativeRecord);
  }
}

/** https://tc39.es/ecma262/#sec-module-environment-records */
export class ModuleEnvironmentRecord extends DeclarativeEnvironmentRecord {
  /** https://tc39.es/ecma262/#sec-module-environment-records-getbindingvalue-n-s */
  GetBindingValue(N, S) {
    // 1. Assert: S is true.
    Assert(S === Value.true);
    // 2. Let envRec be the module Environment Record for which the method was invoked.
    const envRec = this;
    // 3. Assert: envRec has a binding for N.
    const binding = envRec.bindings.get(N);
    Assert(binding !== undefined);
    // 4. If the binding for N is an indirect binding, then
    if (binding.indirect === true) {
      // a. Let M and N2 be the indirection values provided when this binding for N was created.
      const [M, N2] = binding.target;
      // b.Let targetEnv be M.[[Environment]].
      const targetEnv = M.Environment;
      // c. If targetEnv is undefined, throw a ReferenceError exception.
      if (targetEnv === Value.undefined) {
        return surroundingAgent.Throw('ReferenceError', 'NotDefined', N);
      }
      // d. Return ? targetEnv.GetBindingValue(N2, true).
      return Q(targetEnv.GetBindingValue(N2, Value.true));
    }
    // 5. If the binding for N in envRec is an uninitialized binding, throw a ReferenceError exception.
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError', 'NotInitialized', N);
    }
    // 6. Return the value currently bound to N in envRec.
    return binding.value;
  }

  /** https://tc39.es/ecma262/#sec-module-environment-records-deletebinding-n */
  DeleteBinding() {
    Assert(false, 'This method is never invoked. See #sec-delete-operator-static-semantics-early-errors');
  }

  /** https://tc39.es/ecma262/#sec-module-environment-records-hasthisbinding */
  HasThisBinding() {
    // Return true.
    return Value.true;
  }

  /** https://tc39.es/ecma262/#sec-module-environment-records-getthisbinding */
  GetThisBinding() {
    // Return undefined.
    return Value.undefined;
  }

  /** https://tc39.es/ecma262/#sec-createimportbinding */
  CreateImportBinding(N, M, N2) {
    // 1. Let envRec be the module Environment Record for which the method was invoked.
    const envRec = this;
    // 2. Assert: envRec does not already have a binding for N.
    Assert(envRec.HasBinding(N) === Value.false);
    // 3. Assert: M is a Module Record.
    Assert(M instanceof AbstractModuleRecord);
    // 4. Assert: When M.[[Environment]] is instantiated it will have a direct binding for N2.
    // 5. Create an immutable indirect binding in envRec for N that references M and N2 as its target binding and record that the binding is initialized.
    envRec.bindings.set(N, {
      indirect: true,
      target: [M, N2],
      initialized: true,
      mark(m) {
        m(this.target[0]);
        m(this.target[1]);
      },
    });
    // 6. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
}

/** https://tc39.es/ecma262/#sec-getidentifierreference */
export function GetIdentifierReference(env, name, strict) {
  // 1. If lex is the value null, then
  if (env === Value.null) {
    // a. Return the Reference Record { [[Base]]: unresolvable, [[ReferencedName]]: name, [[Strict]]: strict, [[ThisValue]]: empty }.
    return new ReferenceRecord({
      Base: 'unresolvable',
      ReferencedName: name,
      Strict: strict,
      ThisValue: undefined,
    });
  }
  // 2. Let exists be ? envRec.HasBinding(name).
  const exists = Q(env.HasBinding(name));
  // 3. If exists is true, then
  if (exists === Value.true) {
    // a. Return the Reference Record { [[Base]]: env, [[ReferencedName]]: name, [[Strict]]: strict, [[ThisValue]]: empty }.
    return new ReferenceRecord({
      Base: env,
      ReferencedName: name,
      Strict: strict,
      ThisValue: undefined,
    });
  } else {
    // a. Let outer be env.[[OuterEnv]].
    const outer = env.OuterEnv;
    // b. Return ? GetIdentifierReference(outer, name, strict).
    return Q(GetIdentifierReference(outer, name, strict));
  }
}

/** https://tc39.es/ecma262/#sec-newdeclarativeenvironment */
export function NewDeclarativeEnvironment(E) {
  // 1. Let env be a new declarative Environment Record containing O as the binding object.
  const env = new DeclarativeEnvironmentRecord();
  // 2. Set env.[[OuterEnv]] to E.
  env.OuterEnv = E;
  // 3. Return env.
  return env;
}

/** https://tc39.es/ecma262/#sec-newobjectenvironment */
export function NewObjectEnvironment(O, W, E) {
  // 1. Let env be a new object Environment Record.
  const env = new ObjectEnvironmentRecord();
  // 2. Set env.[[BindingObject]] to O.
  env.BindingObject = O;
  // 3. Set env.[[IsWithEnvironment]] to W.
  env.IsWithEnvironment = W;
  // 4. Set env.[[OuterEnv]] to E.
  env.OuterEnv = E;
  // 5. Return env.
  return env;
}

/** https://tc39.es/ecma262/#sec-newfunctionenvironment */
export function NewFunctionEnvironment(F, newTarget) {
  // 1. Assert: F is an ECMAScript function.
  Assert(isECMAScriptFunctionObject(F));
  // 2. Assert: Type(newTarget) is Undefined or Object.
  Assert(newTarget instanceof UndefinedValue || newTarget instanceof ObjectValue);
  // 3. Let env be a new function Environment Record containing no bindings.
  const env = new FunctionEnvironmentRecord();
  // 4. Set env.[[FunctionObject]] to F.
  env.FunctionObject = F;
  // 5. If F.[[ThisMode]] is lexical, set env.[[ThisBindingStatus]] to lexical.
  if (F.ThisMode === 'lexical') {
    env.ThisBindingStatus = 'lexical';
  } else { // 6. Else, set env.[[ThisBindingStatus]] to uninitialized.
    env.ThisBindingStatus = 'uninitialized';
  }
  // 7. Set env.[[NewTarget]] to newTarget.
  env.NewTarget = newTarget;
  // 8. Set env.[[OuterEnv]] to F.[[Environment]].
  env.OuterEnv = F.Environment;
  // 9. Return env.
  return env;
}

/** https://tc39.es/ecma262/#sec-newglobalenvironment */
export function NewGlobalEnvironment(G, thisValue) {
  // 1. Let objRec be NewObjectEnvironment(G, false, null).
  const objRec = NewObjectEnvironment(G, Value.false, Value.null);
  // 2. Let dclRec be a new declarative Environment Record containing no bindings.
  const dclRec = new DeclarativeEnvironmentRecord(Value.null);
  // 3. Let env be a new global Environment Record.
  const env = new GlobalEnvironmentRecord();
  // 4. Set env.[[ObjectRecord]] to objRec.
  env.ObjectRecord = objRec;
  // 5. Set env.[[GlobalThisValue]] to thisValue.
  env.GlobalThisValue = thisValue;
  // 6. Set env.[[DeclarativeRecord]] to dclRec.
  env.DeclarativeRecord = dclRec;
  // 7. Set env.[[VarNames]] to a new empty List.
  env.VarNames = [];
  // 8. Set env.[[OuterEnv]] to null.
  env.OuterEnv = Value.null;
  // 9. Return env.
  return env;
}

/** https://tc39.es/ecma262/#sec-newmoduleenvironment */
export function NewModuleEnvironment(E) {
  // 1. Let env be a new module Environment Record containing no bindings.
  const env = new ModuleEnvironmentRecord();
  // 2. Set env.[[OuterEnv]] to E.
  env.OuterEnv = E;
  // 3. Return env.
  return env;
}

class PrivateEnvironmentRecord {
  OuterPrivateEnvironment;
  Names;
  constructor(init) {
    this.OuterPrivateEnvironment = init.OuterPrivateEnvironment;
    this.Names = init.Names;
  }

  mark(m) {
    this.Names.forEach((name) => {
      m(name);
    });
  }
}

/** https://tc39.es/ecma262/#sec-newprivateenvironment */
export function NewPrivateEnvironment(outerPrivEnv) {
  // 1. Let names be a new empty List.
  const names = [];
  // 2. Return the PrivateEnvironment Record { [[OuterPrivateEnvironment]]: outerPrivEnv, [[Names]]: names }.
  return new PrivateEnvironmentRecord({
    OuterPrivateEnvironment: outerPrivEnv,
    Names: names,
  });
}
