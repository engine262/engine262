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
  FEATURES,
} from './engine.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
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
import { OutOfRange } from './helpers.mjs';

export const Abstract = { ...AbstractOps, Type };
const {
  ObjectCreate,
  CreateBuiltinFunction,
  GetModuleNamespace,
} = Abstract;
export {
  AbruptCompletion,
  NormalCompletion,
  Completion,
  Descriptor,
  FEATURES,
};

export function initializeAgent(options = {}) {
  if (surroundingAgent) {
    throw new Error('Surrounding Agent is already initialized');
  }
  const agent = new Agent(options);
  setSurroundingAgent(agent);
}

function runJobQueue() {
  while (true) { // eslint-disable-line no-constant-condition
    const nextQueue = surroundingAgent.jobQueue;
    if (nextQueue.length === 0) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    const result = nextPending.Job(...nextPending.Arguments);
    surroundingAgent.executionContextStack.pop(newContext);
    if (result instanceof AbruptCompletion) {
      HostReportErrors(result.Value);
    }
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
    return this.scope(() => {
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

      const res = Q(ScriptEvaluation(s));

      runJobQueue();

      return EnsureCompletion(res);
    });
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
        Evaluate: () => this.scope(() => {
          const result = module.Evaluate();
          runJobQueue();
          return result;
        }),
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
    const res = cb();
    surroundingAgent.executionContextStack.pop(this.context);
    this.active = false;
    return res;
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

function Throw(realm, V, ...args) {
  return realm.scope(() => {
    if (typeof V === 'string') {
      return surroundingAgent.Throw(V, args[0]);
    }
    return new ThrowCompletion(V);
  });
}

export {
  APIRealm as Realm,
  APIValue as Value,
  APIObject as Object,
  Throw,
};


const getObjectTag = (value, wrap) => {
  try {
    const s = X(AbstractOps.Get(value, wellKnownSymbols.toStringTag)).stringValue();
    if (wrap) {
      return `[${s}] `;
    }
    return s;
  } catch {
    return '';
  }
};

export function inspect(v, realm = surroundingAgent.currentRealmRecord, compact = false) {
  if (realm instanceof APIRealm) {
    realm = realm.realm;
  }
  let indent = 0;
  const inspected = new WeakSet();

  const innerInspect = (value, quote = true) => {
    const compactObject = (toString) => {
      try {
        const objectToString = realm.Intrinsics['%Object.prototype.toString%'];
        if (toString.nativeFunction === objectToString.nativeFunction) {
          return X(AbstractOps.Call(toString, value)).stringValue();
        } else {
          const tag = getObjectTag(value, false) || 'Unknown';
          const ctor = X(AbstractOps.Get(value, new Value('constructor')));
          if (Type(ctor) === 'Object') {
            const ctorName = X(AbstractOps.Get(ctor, new Value('name'))).stringValue();
            if (ctorName !== '') {
              return `#<${ctorName}>`;
            }
            return `[object ${tag}]`;
          }
          return `[object ${tag}]`;
        }
      } catch (e) {
        return '[object Unknown]';
      }
    };

    const type = Type(value);
    if (type === 'Completion') {
      return innerInspect(value.Value, quote);
    } else if (type === 'Undefined') {
      return 'undefined';
    } else if (type === 'Null') {
      return 'null';
    } else if (type === 'String') {
      return quote ? `'${value.stringValue().replace(/\n/g, '\\n')}'` : value.stringValue();
    } else if (type === 'Number') {
      const n = value.numberValue();
      if (Object.is(n, -0)) {
        return '-0';
      }
      return n.toString();
    } else if (type === 'Boolean') {
      return value.value.toString();
    } else if (type === 'Symbol') {
      return `Symbol(${value.Description.stringValue ? value.Description.stringValue() : ''})`;
    } else if (type === 'Object') {
      if (inspected.has(value)) {
        return '[Circular]';
      }
      inspected.add(value);
      if ('Call' in value) {
        const name = value.properties.get(new Value('name'));
        if (name !== undefined) {
          return `[Function: ${name.Value.stringValue()}]`;
        }
        return '[Function]';
      }
      if ('PromiseState' in value) {
        indent += 1;
        const result = innerInspect(value.PromiseResult);
        indent -= 1;
        return `Promise {
  [[PromiseState]]: '${value.PromiseState}',
  [[PromiseResult]]: ${result},
}`;
      }
      const errorToString = realm.Intrinsics['%Error.prototype%'].properties.get(new Value('toString')).Value;
      const toString = Q(AbstractOps.Get(value, new Value('toString')));
      if (toString.nativeFunction === errorToString.nativeFunction) {
        let e = Q(AbstractOps.Get(value, new Value('stack')));
        if (!e.stringValue) {
          e = X(AbstractOps.Call(toString, value));
        }
        return e.stringValue();
      }
      if ('BooleanData' in value) {
        return `[Boolean: ${innerInspect(value.BooleanData)}]`;
      }
      if ('NumberData' in value) {
        return `[Number: ${innerInspect(value.NumberData)}]`;
      }
      if ('StringData' in value) {
        return `[String: ${innerInspect(value.StringData)}]`;
      }
      if ('SymbolData' in value) {
        return `[Symbol: ${innerInspect(value.SymbolData)}]`;
      }
      if (compact === true || indent > 2) {
        return compactObject(toString);
      }
      try {
        const tag = getObjectTag(value, true);
        const keys = X(value.OwnPropertyKeys());
        if (keys.length === 0) {
          return `${tag}{}`;
        }
        const cache = [];
        for (const key of keys) {
          const C = X(value.GetOwnProperty(key));
          if (C.Enumerable === Value.true) {
            cache.push([
              innerInspect(key, false),
              innerInspect(C.Value),
            ]);
          }
        }
        const isArray = AbstractOps.IsArray(value) === Value.true;
        let out = isArray ? '[' : `${tag}{`;
        if (cache.length > 5) {
          indent += 1;
          cache.forEach((c) => {
            out = `${out}\n${'  '.repeat(indent)}${c[0]}: ${c[1]},`;
          });
          indent -= 1;
          return `${out}\n${'  '.repeat(indent)}${isArray ? ']' : '}'}`;
        } else {
          const oc = compact;
          compact = true;
          cache.forEach((c) => {
            out = `${out} ${c[0]}: ${c[1]},`;
          });
          compact = oc;
          return `${out.slice(0, -1)} ${isArray ? ']' : '}'}`;
        }
      } catch (e) {
        return compactObject(toString);
      }
    }
    throw new OutOfRange('inspect', type);
  };
  return innerInspect(v, false);
}
