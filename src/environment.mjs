import {
  wellKnownSymbols,
  Type,
  New as NewValue,
} from './value.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import {
  Assert,
  Get,
  HasOwnProperty,
  HasProperty,
  ToBoolean,
} from './abstract-ops/all.mjs';
import { Q, NormalCompletion } from './completion.mjs';

export class LexicalEnvironment {
  constructor() {
    this.EnvironmentRecord = undefined;
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
    if (this.bindings.has(N.stringValue())) {
      return true;
    }
    return false;
  }

  CreateMutableBinding(N, D) {
    this.bindings.set(N.stringValue(), {
      initialized: false,
      mutable: true,
      strict: undefined,
      deletable: D,
      value: undefined,
    });
  }

  CreateImmutableBinding(N, S) {
    this.bindings.set(N.stringValue(), {
      initialized: false,
      mutable: false,
      strict: S,
      deletable: false,
      value: undefined,
    });
  }

  InitializeBinding(N, V) {
    const binding = ((this.bindings.get(N.stringValue())));
    Assert(binding !== undefined);
    binding.value = V;
    binding.initialized = true;
  }

  SetMutableBinding(N, V, S) {
    const envRec = this;
    const n = N.stringValue();
    if (!this.bindings.has(n)) {
      if (S === true) {
        return surroundingAgent.Throw('ReferenceError');
      }
      envRec.CreateMutableBinding(N, true);
      envRec.InitializeBinding(N, V);
      return new NormalCompletion(undefined);
    }

    const binding = this.bindings.get(n);

    if (binding.strict === true) {
      S = true;
    }

    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError');
    } else if (binding.mutable === true) {
      binding.value = V;
    } else if (S === true) {
      return surroundingAgent.Throw('ReferenceError');
    }
    return new NormalCompletion(undefined);
  }

  GetBindingValue(N) {
    const binding = this.bindings.get(N.stringValue());
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError');
    }
    return binding.value;
  }

  DeleteBinding(N) {
    const n = N.stringValue();
    const binding = this.bindings.get(n);
    if (binding.deletable === false) {
      return false;
    }

    this.bindings.delete(n);

    return true;
  }

  HasThisBinding() {
    return false;
  }

  HasSuperBinding() {
    return false;
  }

  WithBaseObject() {
    return undefined;
  }
}

export class ObjectEnvironmentRecord extends EnvironmentRecord {
  constructor(BindingObject) {
    super();
    this.bindingObject = BindingObject;
    this.withEnvironment = false;
  }

  HasBinding(N) {
    const envRec = this;
    const bindings = envRec.bindingObject;

    const foundBinding = Q(HasProperty(bindings, N));
    if (foundBinding.isFalse()) {
      return false;
    }

    if (this.withEnvironment === false) {
      return true;
    }

    const unscopables = Q(Get(bindings, wellKnownSymbols.unscopables));
    if (Type(unscopables) === 'Object') {
      const blocked = ToBoolean(Q(Get(unscopables, N)));
      if (blocked.isTrue()) {
        return false;
      }
    }

    return true;
  }

  GetBindingValue(N, S) {
    const envRec = this;
    const bindings = envRec.bindingObject;
    const value = Q(HasProperty(bindings, N));
    if (value.isFalse()) {
      if (S === false) {
        return NewValue(undefined);
      } else {
        return surroundingAgent.Throw('ReferenceError');
      }
    }
    return Q(Get(bindings, N));
  }

  HasThisBinding() {
    return false;
  }
}

export class GlobalEnvironmentRecord extends EnvironmentRecord {
  constructor() {
    super();
    this.ObjectRecord = undefined;
    this.GlobalThisValue = undefined;
    this.DeclarativeRecord = undefined;
    this.VarNames = [];
  }

  HasBinding(N) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return true;
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.HasBinding(N);
  }

  CreateMutableBinding(N, D) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateMutableBinding(N, D);
  }

  CreateImmutableBinding(N, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateImmutableBinding(N, S);
  }

  InitializeBinding(N, V) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.InitializeBinding(N, V);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.InitializeBinding(N, V);
  }

  SetMutableBinding(N, V, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.SetMutableBinding(N, V, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.SetMutableBinding(N, V, S);
  }

  GetBindingValue(N, S) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.GetBindingValue(N, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.GetBindingValue(N, S);
  }

  DeleteBinding(N) {
    const envRec = this;
    const DclRec = this.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.DeleteBinding(N);
    }
    const ObjRec = envRec.ObjectRecord;
    const globalObject = ObjRec.bindingObject;
    const existingProp = HasOwnProperty(globalObject, N);
    if (existingProp === true) {
      const status = ObjRec.DeleteBinding(N);
      if (status === true) {
        const varNames = envRec.VarNames;
        const idx = varNames.indexOf(N.stringValue());
        if (idx >= 0) {
          varNames.splice(idx, 1);
        }
      }
      return status;
    }
    return true;
  }

  HasThisBinding() {
    return true;
  }

  HasSuperBinding() {}

  WithBaseObject() {}

  GetThisBinding() {
    const envRec = this;
    return envRec.GlobalThisValue;
  }

  HasVarDeclaration() {}

  HasLexicalDeclaration() {}

  HasRestrictedGlobalProperty() {}

  CanDeclareGlobalVar() {}

  CanDeclareGlobalFunction() {}

  CreateGlobalVarBinding() {}

  CreateGlobalFunctionBinding() {}
}

// #sec-newdeclarativeenvironment
export function NewDeclarativeEnvironment(E) {
  const env = new LexicalEnvironment();
  const envRec = new DeclarativeEnvironmentRecord();
  env.EnvironmentRecord = envRec;
  env.outerLexicalEnvironment = E;
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
  globalRec.VarNames = [];

  env.EnvironmentRecord = globalRec;

  env.outerLexicalEnvironment = null;

  return env;
}
