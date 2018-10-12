import {
  CreateRealm,
  SetRealmGlobalObject,
  SetDefaultGlobalBindings,
} from './realm.mjs';
import {
  ExecutionContext,
  ScriptEvaluation,
  surroundingAgent,
} from './engine.mjs';
import { Value, Descriptor, Type } from './value.mjs';
import { ParseScript } from './parse.mjs';
import {
  Q,
  Completion,
  NormalCompletion,
  ThrowCompletion,
  AbruptCompletion,
} from './completion.mjs';
import * as AbstractOps from './abstract-ops/all.mjs';

export const Abstract = { ...AbstractOps, Type };
const { ObjectCreate, CreateBuiltinFunction } = Abstract;
export {
  AbruptCompletion,
  NormalCompletion,
  Completion,
  Descriptor,
};

class APIRealm {
  constructor(options = {}) {
    const realm = CreateRealm();

    realm.hostDefinedOptions = options;

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
    globalObj.DefineOwnProperty(new Value('print'), Descriptor({
      Value: CreateBuiltinFunction((args) => {
        if (global.$262 && global.$262.handlePrint) {
          global.$262.handlePrint(...args);
        } else {
          console.log(...args.map((a) => inspect(a))); // eslint-disable-line no-console
        }
        return Value.undefined;
      }, [], realm),
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));

    this.global = globalObj;

    surroundingAgent.executionContextStack.pop();

    this.realm = realm;
    this.context = newContext;
    this.agent = surroundingAgent;
  }

  evaluateScript(sourceText) {
    surroundingAgent.executionContextStack.push(this.context);

    const callerContext = surroundingAgent.runningExecutionContext;
    const callerRealm = callerContext.Realm;
    const callerScriptOrModule = callerContext.ScriptOrModule;

    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = callerRealm;
    newContext.ScriptOrModule = callerScriptOrModule;

    surroundingAgent.executionContextStack.push(newContext);

    const realm = this.realm;
    const s = ParseScript(sourceText, realm, undefined);
    if (Array.isArray(s)) {
      return new ThrowCompletion(s[0]);
    }
    const res = ScriptEvaluation(s);

    while (true) { // eslint-disable-line no-constant-condition
      const nextQueue = surroundingAgent.jobQueue;
      if (nextQueue.length === 0) {
        break;
      }
      const nextPending = nextQueue.shift();
      const newContext = new ExecutionContext(); // eslint-disable-line no-shadow
      newContext.Function = Value.null;
      newContext.Realm = nextPending.Realm;
      newContext.ScriptOrModule = nextPending.ScriptOrModule;
      surroundingAgent.executionContextStack.push(newContext);
      const result = nextPending.Job(...nextPending.Arguments);
      surroundingAgent.executionContextStack.pop();
      if (result instanceof AbruptCompletion) {
        return result;
      }
    }

    surroundingAgent.executionContextStack.pop();
    surroundingAgent.executionContextStack.pop();

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

export function inspect(value, realm = surroundingAgent.currentRealmRecord, quote = true, indent = 0) {
  const type = Type(value);
  if (type === 'Undefined') {
    return 'undefined';
  } else if (type === 'Null') {
    return 'null';
  } else if (type === 'String') {
    return quote ? `'${value.stringValue()}'` : value.stringValue();
  } else if (type === 'Number') {
    return value.numberValue().toString();
  } else if (type === 'Boolean') {
    return value.value.toString();
  } else if (type === 'Symbol') {
    return `Symbol(${value.Description.stringValue()})`;
  } else if (type === 'Object') {
    if ('Call' in value) {
      const name = value.properties.get(new Value('name'));
      if (name !== undefined) {
        return `[Function: ${name.Value.stringValue()}]`;
      }
      return '[Function: <anonymous>]';
    }
    const errorToString = realm.Intrinsics['%ErrorPrototype%'].properties.get(new Value('toString')).Value;
    const toString = Q(AbstractOps.Get(value, new Value('toString')));
    if (toString.nativeFunction === errorToString.nativeFunction) {
      return Q(toString.Call(value, [])).stringValue();
    }
    try {
      const keys = Q(value.OwnPropertyKeys());
      if (keys.length === 0) {
        return '{}';
      }
      const isArray = AbstractOps.IsArray(value) === Value.true;
      let out = isArray ? '[' : '{';
      indent += 1;
      for (const key of keys) {
        const C = value.properties.get(key);
        out = `${out}\n${'  '.repeat(indent)}${inspect(key, realm, false, indent)}: ${inspect(C.Value, realm, false, indent)},`;
      }
      indent -= 1;
      return `${out}\n${'  '.repeat(indent)}${isArray ? ']' : '}'}`;
    } catch (e) {
      const objectToString = realm.Intrinsics['%ObjProto_toString%'];
      if (toString.nativeFunction === objectToString.nativeFunction) {
        return Q(toString.Call(value, [])).stringValue();
      } else {
        const ctor = Q(AbstractOps.Get(value, new Value('constructor')));
        if (Type(ctor) === 'Object') {
          const ctorName = Q(AbstractOps.Get(ctor, new Value('name'))).stringValue();
          if (ctorName !== '') {
            return `#<${ctorName}>`;
          }
          return '[object Unknown]';
        }
        return '[object Unknown]';
      }
    }
  }
  throw new RangeError();
}
