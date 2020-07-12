import { Value } from './value.mjs';
import {
  surroundingAgent,
  ExecutionContext,
  HostCleanupFinalizationRegistry,
  ScriptEvaluation,
} from './engine.mjs';
import {
  X,
  ThrowCompletion,
  AbruptCompletion,
  EnsureCompletion,
} from './completion.mjs';
import {
  Realm,
  ClearKeptObjects,
  CreateIntrinsics,
  GetModuleNamespace,
  SetRealmGlobalObject,
  SetDefaultGlobalBindings,
} from './abstract-ops/all.mjs';
import {
  ParseScript,
  ParseModule,
} from './parse.mjs';

export * from './value.mjs';
export * from './engine.mjs';
export * from './completion.mjs';
export * from './abstract-ops/all.mjs';
export * from './parse.mjs';
export * from './inspect.mjs';

export function Throw(...args) {
  return surroundingAgent.Throw(...args);
}

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
  const ephemeronQueue = [];

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
      O.WeakMapData.forEach((r) => {
        ephemeronQueue.push(r);
      });
    } else if ('WeakSetData' in O) {
      weaksets.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if (O.mark) {
      O.mark(markCb);
    }
  };

  if (surroundingAgent.feature('WeakRefs')) {
    ClearKeptObjects();
  }

  markCb(surroundingAgent);

  while (ephemeronQueue.length > 0) {
    const item = ephemeronQueue.shift();
    if (marked.has(item.Key)) {
      markCb(item.Value);
    }
  }

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

// https://tc39.es/ecma262/#sec-jobs
export function runJobQueue() {
  if (surroundingAgent.executionContextStack.some((e) => e.ScriptOrModule !== Value.null)) {
    return;
  }

  // At some future point in time, when there is no running execution context
  // and the execution context stack is empty, the implementation must:
  while (surroundingAgent.jobQueue.length > 0) { // eslint-disable-line no-constant-condition
    const {
      job: abstractClosure,
      callerRealm,
      callerScriptOrModule,
    } = surroundingAgent.jobQueue.shift();

    // 1. Push an execution context onto the execution context stack.
    const newContext = new ExecutionContext();
    surroundingAgent.executionContextStack.push(newContext);
    // 2. Perform any implementation-defined preparation steps.
    newContext.Function = Value.null;
    newContext.Realm = callerRealm;
    newContext.ScriptOrModule = callerScriptOrModule;
    // 3. Call the abstract closure.
    X(abstractClosure());
    // 4. Perform any implementation-defined cleanup steps.
    mark();
    // 5. Pop the previously-pushed execution context from the execution context stack.
    surroundingAgent.executionContextStack.pop(newContext);
  }
}

export function evaluateScript(sourceText, realm, hostDefined) {
  const s = ParseScript(sourceText, realm, hostDefined);
  if (Array.isArray(s)) {
    return ThrowCompletion(s[0]);
  }

  return EnsureCompletion(ScriptEvaluation(s));
}

export class ManagedRealm extends Realm {
  constructor(HostDefined = {}) {
    super();
    // CreateRealm()
    CreateIntrinsics(this);
    this.GlobalObject = Value.undefined;
    this.GlobalEnv = Value.undefined;
    this.TemplateMap = [];

    // InitializeHostDefinedRealm()
    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = this;
    newContext.ScriptOrModule = Value.null;
    surroundingAgent.executionContextStack.push(newContext);
    SetRealmGlobalObject(this, Value.undefined, Value.undefined);
    SetDefaultGlobalBindings(this);

    // misc
    surroundingAgent.executionContextStack.pop(newContext);
    this.HostDefined = HostDefined;
    this.topContext = newContext;
    this.active = false;
  }

  scope(cb) {
    if (this.active) {
      return cb();
    }
    this.active = true;
    surroundingAgent.executionContextStack.push(this.topContext);
    const r = cb();
    surroundingAgent.executionContextStack.pop(this.topContext);
    this.active = false;
    return r;
  }

  evaluateScript(sourceText, { specifier } = {}) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }

    const res = this.scope(() => {
      const realm = surroundingAgent.currentRealmRecord;
      return evaluateScript(sourceText, realm, {
        specifier,
        public: { specifier },
      });
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
      return ThrowCompletion(module[0]);
    }
    module.HostDefined.public.module = module;
    return module.HostDefined.public;
  }
}
