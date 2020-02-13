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
  HostCleanupFinalizationGroup,
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
  ObjectCreate,
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
  const marked = new Set();
  const weakrefs = new Set();
  const fgs = new Set();

  const markCb = (o) => {
    if (o === undefined || o === null) {
      return;
    }
    if (marked.has(o)) {
      return;
    }
    marked.add(o);
    if ('WeakRefTarget' in o) {
      weakrefs.add(o);
    }
    if ('Cells' in o) {
      fgs.add(o);
    }
    o.mark(markCb);
  };
  markCb(surroundingAgent);

  // https://tc39.es/proposal-weakrefs/#sec-weakref-execution
  // At any time, if an object obj is not live, an ECMAScript implementation may perform the following steps atomically:
  // 1. For each WeakRef ref such that ref.[[WeakRefTarget]] is obj,
  //   a. Set ref.[[WeakRefTarget]] to empty.
  // 2. For each FinalizationGroup fg such that fg.[[Cells]] contains cell, such that cell.[[WeakRefTarget]] is obj,
  //   a. Set cell.[[WeakRefTarget]] to empty.
  //   b. Optionally, perform ! HostCleanupFinalizationGroup(fg).

  weakrefs.forEach((w) => {
    if (!marked.has(w.WeakRefTarget)) {
      w.WeakRefTarget = undefined;
    }
  });

  fgs.forEach((fg) => {
    let foundEmptyCell = false;
    fg.Cells.forEach((cell) => {
      if (!marked.has(cell.WeakRefTarget)) {
        cell.WeakRefTarget = undefined;
        foundEmptyCell = true;
      }
    });
    if (foundEmptyCell) {
      X(HostCleanupFinalizationGroup(fg));
    }
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

    if (surroundingAgent.feature('WeakRefs')) {
      AbstractOps.ClearKeptObjects();
      mark();
    }

    surroundingAgent.executionContextStack.pop(newContext);
  }
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
  return ObjectCreate(realm.realm.Intrinsics[intrinsic]);
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
