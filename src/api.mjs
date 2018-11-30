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
} from './engine.mjs';
import { Descriptor, Type, Value } from './value.mjs';
import { ParseScript } from './parse.mjs';
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
const { ObjectCreate, CreateBuiltinFunction } = Abstract;
export {
  AbruptCompletion,
  NormalCompletion,
  Completion,
  Descriptor,
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
    {
      const print = CreateBuiltinFunction((args) => {
        if (options.handlePrint) {
          Q(options.handlePrint(...args));
        } else {
          console.log(...args.map((a) => inspect(a))); // eslint-disable-line no-console
        }
        return Value.undefined;
      }, [], realm);

      const raw = CreateBuiltinFunction((args) => {
        console.log(...args); // eslint-disable-line no-console
        return Value.undefined;
      }, [], realm);

      X(print.DefineOwnProperty(new Value('raw'), Descriptor({
        Value: raw,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
      })));

      X(globalObj.DefineOwnProperty(new Value('print'), Descriptor({
        Value: print,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
      })));
    }

    surroundingAgent.executionContextStack.pop(newContext);

    this.global = globalObj;
    this.realm = realm;
    this.context = newContext;
    this.agent = surroundingAgent;

    this.active = false;
  }

  evaluateScript(sourceText) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    return this.scope(() => {
      // BEGIN ScriptEvaluationJob
      const realm = surroundingAgent.currentRealmRecord;
      const s = ParseScript(sourceText, realm, undefined);
      if (Array.isArray(s)) {
        return new ThrowCompletion(s[0]);
      }
      // END ScriptEvaluationJob

      const res = Q(ScriptEvaluation(s));

      runJobQueue();

      return EnsureCompletion(res);
    });
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

function APIObject(realm, intrinsic = '%ObjectPrototype%') {
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
  APIRealm as Realm,
  APIValue as Value,
  APIObject as Object,
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
        const objectToString = realm.Intrinsics['%ObjProto_toString%'];
        if (toString.nativeFunction === objectToString.nativeFunction) {
          return X(AbstractOps.Call(toString, value, [])).stringValue();
        } else {
          const ctor = X(AbstractOps.Get(value, new Value('constructor')));
          if (Type(ctor) === 'Object') {
            const ctorName = X(AbstractOps.Get(ctor, new Value('name'))).stringValue();
            if (ctorName !== '') {
              return `#<${ctorName}>`;
            }
            return '[object Unknown]';
          }
          return '[object Unknown]';
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
        return `Promise {
  [[PromiseState]]: '${value.PromiseState}',
  [[PromiseResult]]: ${innerInspect(value.PromiseResult)},
}`;
      }
      const errorToString = realm.Intrinsics['%ErrorPrototype%'].properties.get(new Value('toString')).Value;
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
        const keys = X(value.OwnPropertyKeys());
        if (keys.length === 0) {
          return '{}';
        }
        const isArray = AbstractOps.IsArray(value) === Value.true;
        let out = isArray ? '[' : '{';
        if (value.properties.size > 5) {
          indent += 1;
          for (const key of keys) {
            const C = value.properties.get(key);
            out = `${out}\n${'  '.repeat(indent)}${innerInspect(key, false)}: ${innerInspect(C.Value)},`;
          }
          indent -= 1;
          return `${out}\n${'  '.repeat(indent)}${isArray ? ']' : '}'}`;
        } else {
          for (const key of keys) {
            const C = value.properties.get(key);
            out = `${out} ${innerInspect(key, false)}: ${innerInspect(C.Value)},`;
          }
          return `${out.slice(0, -1)} ${isArray ? ']' : '}'}`;
        }
      } catch (e) {
        return compactObject(toString);
      }
    }
    throw new OutOfRange('inspect', type);
  };
  return innerInspect(v);
}
