// @ts-nocheck
import { Value } from './value.mjs';
import {
  surroundingAgent,
  ExecutionContext,
  HostEnqueueFinalizationRegistryCleanupJob,
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
  SetRealmGlobalObject,
  SetDefaultGlobalBindings,
} from './abstract-ops/all.mjs';
import {
  ParseScript,
  ParseModule,
  ParseJSONModule,
} from './parse.mjs';
import { SourceTextModuleRecord } from './modules.mjs';
import * as messages from './messages.mjs';

export * from './value.mjs';
export * from './engine.mjs';
export * from './completion.mjs';
export * from './abstract-ops/all.mjs';
export * from './static-semantics/all.mjs';
export * from './runtime-semantics/all.mjs';
export * from './environment.mjs';
export * from './parse.mjs';
export * from './modules.mjs';
export * from './inspect.mjs';

export function Throw<K extends keyof typeof messages>(type: string | Value, template: K, ...templateArgs: Parameters<typeof messages[K]>): ThrowCompletion {
  return surroundingAgent.Throw(type, template, ...templateArgs);
}

/** https://tc39.es/ecma262/#sec-weakref-execution */
export function gc() {
  // At any time, if a set of objects S is not live, an ECMAScript implementation may perform the following steps atomically:
  // 1. For each obj of S, do
  //   a. For each WeakRef ref such that ref.[[WeakRefTarget]] is obj,
  //     i. Set ref.[[WeakRefTarget]] to empty.
  //   b. For each FinalizationRegistry fg such that fg.[[Cells]] contains cell, and cell.[[WeakRefTarget]] is obj,
  //     i. Set cell.[[WeakRefTarget]] to empty.
  //     ii. Optionally, perform ! HostEnqueueFinalizationRegistryCleanupJob(fg).
  //   c. For each WeakMap map such that map.WeakMapData contains a record r such that r.Key is obj,
  //     i. Set r.[[Key]] to empty.
  //     ii. Set r.[[Value]] to empty.
  //   d. For each WeakSet set such that set.[[WeakSetData]] contains obj,
  //     i. Replace the element of set whose value is obj with an element whose value is empty.

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

  markCb(surroundingAgent);

  while (ephemeronQueue.length > 0) {
    const item = ephemeronQueue.shift();
    if (marked.has(item.Key)) {
      markCb(item.Value);
    }
  }

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
      X(HostEnqueueFinalizationRegistryCleanupJob(fg));
    }
  });

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

/** https://tc39.es/ecma262/#sec-jobs */
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

    // 1. Perform any implementation-defined preparation steps.
    const newContext = new ExecutionContext();
    surroundingAgent.executionContextStack.push(newContext);
    newContext.Function = Value.null;
    newContext.Realm = callerRealm;
    newContext.ScriptOrModule = callerScriptOrModule;
    // 2. Call the abstract closure.
    X(abstractClosure());
    // 3. Perform any host-defined cleanup steps, after which the execution context stack must be empty.
    ClearKeptObjects();
    gc();
    surroundingAgent.executionContextStack.pop(newContext);
  }
}

export function evaluateScript(sourceText: string, realm: Realm, hostDefined) {
  const s = ParseScript(sourceText, realm, hostDefined);
  if (Array.isArray(s)) {
    return ThrowCompletion(s[0]);
  }

  return EnsureCompletion(ScriptEvaluation(s));
}

export class ManagedRealm extends Realm {
  topContext;
  active = false;
  constructor(HostDefined = {}) {
    super();
    // CreateRealm()
    CreateIntrinsics(this);
    this.GlobalObject = Value.undefined;
    this.GlobalEnv = Value.undefined;
    this.TemplateMap = [];
    this.LoadedModules = [];

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
  }

  scope<T>(cb: () => T) {
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

  evaluateScript(sourceText: string, { specifier } = {}) {
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

  createSourceTextModule(specifier: string, sourceText: string) {
    if (typeof specifier !== 'string') {
      throw new TypeError('specifier must be a string');
    }
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => ParseModule(sourceText, this, {
      specifier,
      SourceTextModuleRecord: ManagedSourceTextModuleRecord,
    }));
    if (Array.isArray(module)) {
      return ThrowCompletion(module[0]);
    }
    return module;
  }

  createJSONModule(specifier: string, sourceText: string) {
    if (typeof specifier !== 'string') {
      throw new TypeError('specifier must be a string');
    }
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => ParseJSONModule(Value(sourceText), this, {
      specifier,
    }));
    return module;
  }
}

class ManagedSourceTextModuleRecord extends SourceTextModuleRecord {
  override Evaluate() {
    const r = super.Evaluate();
    if (!(r instanceof AbruptCompletion)) {
      runJobQueue();
    }
    return r;
  }
}
