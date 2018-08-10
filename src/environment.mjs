/* ::
import type {
  Realm,
} from './realm';

import type {
  Value,
  StringValue,
  ObjectValue,
} from './value';
import type {
  List,
} from './abstract-ops/spec-types';
*/

import {
  wellKnownSymbols,
  Type,
  New as NewValue,
} from './value';
import {
  surroundingAgent,
} from './engine';
import {
  Assert,
  Get,
  HasOwnProperty,
  HasProperty,
  ToBoolean,
} from './abstract-ops/all';
import { Q } from './completion';

export class LexicalEnvironment {
  /* ::
  EnvironmentRecord: ?EnvironmentRecord
  */
  constructor() {
    this.EnvironmentRecord = undefined;
  }
}

export class EnvironmentRecord {}

/* ::
declare type Binding = {
  initialized: boolean,
  mutable: boolean,
  strict: ?boolean,
  deletable: boolean,
  value: ?Value,
};
*/

// https://tc39.github.io/ecma262/#sec-lexical-environments
export class DeclarativeEnvironmentRecord extends EnvironmentRecord {
  /* ::
  bindings: Map<string, Binding>
  */
  constructor() {
    super();
    this.bindings = new Map();
  }

  HasBinding(N /* : StringValue */) {
    if (this.bindings.has(N.stringValue())) {
      return true;
    }
    return false;
  }

  CreateMutableBinding(N /* : StringValue */, D /* : boolean */) {
    this.bindings.set(N.stringValue(), {
      initialized: false,
      mutable: true,
      strict: undefined,
      deletable: D,
      value: undefined,
    });
  }

  CreateImmutableBinding(N /* : StringValue */, S /* : boolean */) {
    this.bindings.set(N.stringValue(), {
      initialized: false,
      mutable: false,
      strict: S,
      deletable: false,
      value: undefined,
    });
  }

  InitializeBinding(N /* : StringValue */, V /* : Value */) {
    const binding = ((this.bindings.get(N.stringValue()) /* : any */) /* : Binding */);
    Assert(binding !== undefined);
    binding.value = V;
    binding.initialized = true;
  }

  SetMutableBinding(N /* : StringValue */, V /* : Value */, S /* : boolean */) {
    const envRec = this;
    const n = N.stringValue();
    if (!this.bindings.has(n)) {
      if (S === true) {
        return surroundingAgent.Throw('ReferenceError');
        envRec.CreateMutableBinding(N, true);
        envRec.InitializeBinding(N, V);
      }
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
  }

  GetBindingValue(N /* : StringValue *//* , S */) {
    const binding = this.bindings.get(N.stringValue());
    if (binding.initialized === false) {
      return surroundingAgent.Throw('ReferenceError');
    }
    return binding.value;
  }

  DeleteBinding(N /* : StringValue */) {
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

  HasBinding(N /* : StringValue */) {
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

  GetBindingValue(N /* : Value */, S /* : boolean */) {
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
  /* ::
  ObjectRecord: ObjectEnvironmentRecord
  GlobalThisValue: ObjectValue
  DeclarativeRecord: DeclarativeEnvironmentRecord
  VarNames: List<string>
  */
  constructor() {
    super();
    // $FlowFixMe
    this.ObjectRecord = undefined;
    // $FlowFixMe
    this.GlobalThisValue = undefined;
    // $FlowFixMe
    this.DeclarativeRecord = undefined;
    this.VarNames = [];
  }

  HasBinding(N /* : StringValue */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return true;
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.HasBinding(N);
  }

  CreateMutableBinding(N /* : StringValue */, D /* : boolean */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateMutableBinding(N, D);
  }

  CreateImmutableBinding(N /* : StringValue */, S /* : boolean */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return surroundingAgent.Throw('TypeError');
    }
    return DclRec.CreateImmutableBinding(N, S);
  }

  InitializeBinding(N /* : StringValue */, V /* : Value */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.InitializeBinding(N, V);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.InitializeBinding(N, V);
  }

  SetMutableBinding(N /* : StringValue */, V /* : Value */, S /* : boolean */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.SetMutableBinding(N, V, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.SetMutableBinding(N, V, S);
  }

  GetBindingValue(N /* : StringValue */, S /* : boolean */) {
    const envRec = this;
    const DclRec = envRec.DeclarativeRecord;
    if (DclRec.HasBinding(N)) {
      return DclRec.GetBindingValue(N, S);
    }
    const ObjRec = envRec.ObjectRecord;
    return ObjRec.GetBindingValue(N, S);
  }

  DeleteBinding(N /* : StringValue */) {
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
    return this.GlobalThisValue;
  }

  HasVarDeclaration() {}

  HasLexicalDeclaration() {}

  HasRestrictedGlobalProperty() {}

  CanDeclareGlobalVar() {}

  CanDeclareGlobalFunction() {}

  CreateGlobalVarBinding() {}

  CreateGlobalFunctionBinding() {}
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
