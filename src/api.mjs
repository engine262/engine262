import {
  CreateRealm,
  SetDefaultGlobalBindings,
  SetRealmGlobalObject,
} from './realm.mjs';
import {
  ExecutionContext,
  ScriptEvaluation,
  surroundingAgent,
  setSurroundingAgent,
  Agent,
  HostReportErrors,
  HostCleanupFinalizationRegistry,
  FEATURES,
} from './engine.mjs';
import {
  Descriptor,
  Type,
  Value,
} from './value.mjs';
import { ParseScript, ParseModule } from './parse.mjs';
import {
  AbruptCompletion,
  Completion,
  NormalCompletion,
  Q, X,
  ThrowCompletion,
  EnsureCompletion,
} from './completion.mjs';
import * as AbstractOps from './abstract-ops/all.mjs';

export const Abstract = { ...AbstractOps, Type };
const {
  OrdinaryObjectCreate,
  CreateBuiltinFunction,
  GetModuleNamespace,
  ToPrimitive,
} = Abstract;
export {
  AbruptCompletion,
  NormalCompletion,
  Completion,
  Descriptor,
  FEATURES,
};

export { inspect } from './inspect.mjs';

function mark() {
  // https://tc39.es/proposal-weakrefs/#sec-weakref-execution
  // At any time, if a set of objects S is not live, an ECMAScript implementation may perform the following steps automically:
  // 1. For each obj os S, do
  //   a. For each WeakRef ref such that ref.[[WeakRefTarget]] is obj,
  //     i. Set ref.[[WeakRefTarget]] to empty.
  //   b. For each FinalizationRegistry fg such that fg.[[Cells]] contains cell, such that cell.[[WeakRefTarget]] is obj,
  //     i. Set cell.[[WeakRefTarget]] to empty.
  //     ii. Optionally, perform ! HostCleanupFinalizationRegistry(fg).
  //   c. For each WeakMap map such that map.WeakMapData contains a record r such that r.Key is obj,
  //     i. Remove r from map.WeakMapData.
  //   d. For each WeakSet set such that set.WeakSetData contains obj,
  //     i. Remove obj from WeakSetData.

  const marked = new Set();
  const weakrefs = new Set();
  const fgs = new Set();
  const weakmaps = new Set();
  const weaksets = new Set();

  const markCb = (O) => {
    if (typeof O !== 'object' || O === null) {
      return;
    }

    if (marked.has(O)) {
      return;
    }
    marked.add(O);

    if ('WeakRefTarget' in O && !('HeldValue' in O)) {
      weakrefs.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if ('Cells' in O) {
      fgs.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
      O.Cells.forEach((cell) => {
        markCb(cell.HeldValue);
      });
    } else if ('WeakMapData' in O) {
      weakmaps.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if ('WeakSetData' in O) {
      weaksets.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if (O.mark) {
      O.mark(markCb);
    }
  };

  if (surroundingAgent.feature('WeakRefs')) {
    AbstractOps.ClearKeptObjects();
  }

  markCb(surroundingAgent);

  if (surroundingAgent.feature('WeakRefs')) {
    weakrefs.forEach((ref) => {
      if (!marked.has(ref.WeakRefTarget)) {
        ref.WeakRefTarget = undefined;
      }
    });

    fgs.forEach((fg) => {
      let dirty = false;
      fg.Cells.forEach((cell) => {
        if (!marked.has(cell.WeakRefTarget)) {
          cell.WeakRefTarget = undefined;
          dirty = true;
        }
      });
      if (dirty) {
        X(HostCleanupFinalizationRegistry(fg));
      }
    });
  }

  weakmaps.forEach((map) => {
    map.WeakMapData.forEach((r) => {
      if (!marked.has(r.Key)) {
        r.Key = undefined;
        r.Value = undefined;
      }
    });
  });

  weaksets.forEach((set) => {
    set.WeakSetData.forEach((obj, i) => {
      if (!marked.has(obj)) {
        set.WeakSetData[i] = undefined;
      }
    });
  });
}

function runJobQueue() {
  if (surroundingAgent.executionContextStack.length !== 0) {
    return;
  }


  while (true) { // eslint-disable-line no-constant-condition
    const nextQueue = surroundingAgent.jobQueue;
    if (nextQueue.length === 0
        || nextQueue.find((j) => j.HostDefined.queueName !== 'FinalizationCleanup') === undefined) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    const result = nextPending.Job(...nextPending.Arguments);
    if (result instanceof AbruptCompletion) {
      HostReportErrors(result.Value);
    }

    mark();

    surroundingAgent.executionContextStack.pop(newContext);
  }

  surroundingAgent.jobQueue = [];
}

class APIAgent {
  constructor(options = {}) {
    this.agent = new Agent(options);
    this.active = false;
    this.outerAgent = undefined;
  }

  scope(cb) {
    this.enter();
    try {
      return cb();
    } finally {
      this.exit();
    }
  }

  enter() {
    if (this.active) {
      throw new Error('Agent is already entered');
    }
    this.active = true;
    this.outerAgent = surroundingAgent;
    setSurroundingAgent(this.agent);
  }

  exit() {
    if (!this.active) {
      throw new Error('Agent is not entered');
    }
    setSurroundingAgent(this.outerAgent);
    this.outerAgent = undefined;
    this.active = false;
  }
}

class APIRealm {
  constructor(options = {}) {
    const realm = CreateRealm();

    realm.HostDefined = options;

    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = realm;
    newContext.ScriptOrModule = Value.null;
    surroundingAgent.executionContextStack.push(newContext);
    const global = Value.undefined;
    const thisValue = Value.undefined;
    SetRealmGlobalObject(realm, global, thisValue);
    const globalObj = SetDefaultGlobalBindings(realm);

    // Create any implementation-defined global object properties on globalObj.

    surroundingAgent.executionContextStack.pop(newContext);

    this.global = globalObj;
    this.realm = realm;
    this.context = newContext;
    this.agent = surroundingAgent;

    this.active = false;
  }

  evaluateScript(sourceText, { specifier } = {}) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }

    const res = this.scope(() => {
      // BEGIN ScriptEvaluationJob
      const realm = surroundingAgent.currentRealmRecord;
      const s = ParseScript(sourceText, realm, {
        specifier,
        public: {
          specifier,
        },
      });
      if (Array.isArray(s)) {
        return new ThrowCompletion(s[0]);
      }
      // END ScriptEvaluationJob

      return EnsureCompletion(ScriptEvaluation(s));
    });

    if (!(res instanceof AbruptCompletion)) {
      runJobQueue();
    }

    return res;
  }

  createSourceTextModule(specifier, sourceText) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    if (typeof specifier !== 'string') {
      throw new TypeError('specifier must be a string');
    }
    const module = this.scope(() => ParseModule(sourceText, this.realm, {
      specifier,
      public: {
        specifier,
        Link: () => this.scope(() => module.Link()),
        GetNamespace: () => this.scope(() => GetModuleNamespace(module)),
        Evaluate: () => {
          const res = this.scope(() => module.Evaluate());
          if (!(res instanceof AbruptCompletion)) {
            runJobQueue();
          }
          return res;
        },
      },
    }));
    if (Array.isArray(module)) {
      return new ThrowCompletion(module[0]);
    }
    module.HostDefined.public.module = module;
    return module.HostDefined.public;
  }

  scope(cb) {
    if (this.active) {
      return cb();
    }
    this.active = true;
    surroundingAgent.executionContextStack.push(this.context);
    const r = cb();
    surroundingAgent.executionContextStack.pop(this.context);
    this.active = false;
    return r;
  }
}

function APIObject(realm, intrinsic = '%Object.prototype%') {
  return OrdinaryObjectCreate(realm.realm.Intrinsics[intrinsic]);
}

class APIValue extends Value {
  constructor(realm, value) {
    if (typeof value === 'function') {
      return CreateBuiltinFunction(value, [], realm.realm);
    }
    if (value === undefined) {
      return Value.undefined;
    }
    if (value === null) {
      return Value.null;
    }
    if (value === true) {
      return Value.true;
    }
    if (value === false) {
      return Value.false;
    }
    return new Value(value);
  }
}

export {
  APIAgent as Agent,
  APIRealm as Realm,
  APIValue as Value,
  APIObject as Object,
};

export function Throw(realm, V, ...args) {
  return realm.scope(() => {
    if (typeof V === 'string') {
      // eslint-disable-next-line engine262/valid-throw
      return surroundingAgent.Throw(V, 'Raw', args[0]);
    }
    return new ThrowCompletion(V);
  });
}

export function ToString(realm, value) {
  return realm.scope(() => {
    while (true) {
      const type = Type(value);
      switch (type) {
        case 'String':
          return value.stringValue();
        case 'Number':
          return value.numberValue().toString();
        case 'Boolean':
          return value === Value.true ? 'true' : 'false';
        case 'Undefined':
          return 'undefined';
        case 'Null':
          return 'null';
        case 'Symbol':
          return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'string');
        default:
          value = Q(ToPrimitive(value, 'String'));
          break;
      }
    }
  });
}
