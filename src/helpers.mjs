import { surroundingAgent } from './engine.mjs';
import { Type, Value, Descriptor } from './value.mjs';
import { ToString, DefinePropertyOrThrow, CreateBuiltinFunction } from './abstract-ops/all.mjs';
import { X, AwaitFulfilledFunctions } from './completion.mjs';

function convertValueForKey(key) {
  switch (Type(key)) {
    case 'String':
      return key.stringValue();
    case 'Number':
      if (key.numberValue() === 0 && Object.is(key.numberValue(), -0)) {
        return key;
      }
      return key.numberValue();
    default:
      return key;
  }
}

export class ValueMap extends Map {
  constructor(init) {
    super();
    if (init !== null && init !== undefined) {
      for (const [k, v] of init) {
        this.set(convertValueForKey(k), v);
      }
    }
  }

  get(key) {
    return super.get(convertValueForKey(key));
  }

  set(key, value) {
    return super.set(convertValueForKey(key), value);
  }

  has(key) {
    return super.has(convertValueForKey(key));
  }

  delete(key) {
    return super.delete(convertValueForKey(key));
  }

  * keys() {
    for (const [key] of this) {
      yield key;
    }
  }

  * values() {
    for (const [, value] of this) {
      yield value;
    }
  }

  entries() {
    return this[Symbol.iterator]();
  }

  forEach(cb) {
    for (const [key, value] of this) {
      cb(value, key, this);
    }
  }

  * [Symbol.iterator]() {
    for (const [key, value] of super.entries()) {
      if (typeof key === 'string' || typeof key === 'number') {
        yield [new Value(key), value];
      } else {
        yield [key, value];
      }
    }
  }

  mark(m) {
    for (const [k, v] of this.entries()) {
      m(k);
      m(v);
    }
  }
}

export class ValueSet extends Set {
  constructor(init) {
    super();
    if (init !== undefined && init !== null) {
      for (const item of init) {
        this.add(item);
      }
    }
  }

  add(item) {
    return super.add(convertValueForKey(item));
  }

  has(item) {
    return super.has(convertValueForKey(item));
  }

  delete(item) {
    return super.delete(convertValueForKey(item));
  }

  keys() {
    return this[Symbol.iterator]();
  }

  values() {
    return this[Symbol.iterator]();
  }

  * [Symbol.iterator]() {
    for (const key of super.values()) {
      if (typeof key === 'string' || typeof key === 'number') {
        yield new Value(key);
      } else {
        yield key;
      }
    }
  }

  mark(m) {
    for (const v of this.values()) {
      m(v);
    }
  }
}

export class OutOfRange extends RangeError {
  constructor(fn, detail) {
    super(`${fn}() argument out of range`);

    this.detail = detail;
  }
}

export function unwind(iterator, maxSteps = 1) {
  let steps = 0;
  while (true) {
    const { done, value } = iterator.next('Unwind');
    if (done) {
      return value;
    }
    steps += 1;
    if (steps > maxSteps) {
      throw new RangeError('Max steps exceeded');
    }
  }
}

const kSafeToResume = Symbol('kSameToResume');

export function handleInResume(fn, ...args) {
  const bound = () => fn(...args);
  bound[kSafeToResume] = true;
  return bound;
}

export function resume(context, completion) {
  const { value } = context.codeEvaluationState.next(completion);
  if (typeof value === 'function' && value[kSafeToResume] === true) {
    return X(value());
  }
  return value;
}

export class CallSite {
  constructor(context) {
    this.context = context;
    this.lastNode = null;
    this.constructCall = false;
  }

  clone(context = this.context) {
    const c = new CallSite(context);
    c.lastNode = this.lastNode;
    c.constructCall = this.constructCall;
    return c;
  }

  isTopLevel() {
    return this.context.Function === Value.null;
  }

  isConstructCall() {
    return this.constructCall;
  }

  isAsync() {
    if (this.context.Function !== Value.null) {
      return this.context.Function.ECMAScriptCode && this.context.Function.ECMAScriptCode.async;
    }
    return false;
  }

  isNative() {
    return !!this.context.Function.nativeFunction;
  }

  getFunctionName() {
    if (this.context.Function !== Value.null) {
      const name = this.context.Function.properties.get(new Value('name'));
      if (name) {
        return X(ToString(name.Value)).stringValue();
      }
    }
    return null;
  }

  getSpecifier() {
    if (this.context.ScriptOrModule !== Value.null) {
      return this.context.ScriptOrModule.HostDefined.specifier;
    }
    return null;
  }

  setLocation(node) {
    this.lastNode = node;
  }

  get lineNumber() {
    if (this.lastNode) {
      return this.lastNode.location.start.line;
    }
    return null;
  }

  get columnNumber() {
    if (this.lastNode) {
      return this.lastNode.location.start.column;
    }
    return null;
  }

  loc() {
    if (this.isNative()) {
      return 'native';
    }
    let out = '';
    const specifier = this.getSpecifier();
    if (specifier) {
      out += specifier;
    } else {
      out += '<anonymous>';
    }
    if (this.lineNumber !== null) {
      out += `:${this.lineNumber}`;
      if (this.columnNumber !== null) {
        out += `:${this.columnNumber}`;
      }
    }
    return out.trim();
  }

  toString() {
    const isAsync = this.isAsync();
    const functionName = this.getFunctionName();
    const isConstructCall = this.isConstructCall();
    const isMethodCall = !isConstructCall && !this.isTopLevel();

    let string = isAsync ? 'async ' : '';

    if (isConstructCall) {
      string += 'new ';
    }

    if (isMethodCall || isConstructCall) {
      if (functionName) {
        string += functionName;
      } else {
        string += '<anonymous>';
      }
    } else if (functionName) {
      string += functionName;
    } else {
      return `${string}${this.loc()}`;
    }

    return `${string} (${this.loc()})`;
  }
}

function captureAsyncStack(stack) {
  let promise = stack[0].context.promiseCapability.Promise;
  for (let i = 0; i < 10; i += 1) {
    if (promise.PromiseFulfillReactions.length !== 1) {
      return;
    }
    const [reaction] = promise.PromiseFulfillReactions;
    if (reaction.Handler.nativeFunction === AwaitFulfilledFunctions) {
      const asyncContext = reaction.Handler.AsyncContext;
      stack.push(asyncContext.callSite.clone());
      if ('PromiseState' in asyncContext.promiseCapability.Promise) {
        promise = asyncContext.promiseCapability.Promise;
      } else {
        return;
      }
    } else if (reaction.Capability !== Value.undefined) {
      if ('PromiseState' in reaction.Capability.Promise) {
        promise = reaction.Capability.Promise;
      } else {
        return;
      }
    }
  }
}

export function captureStack(O) {
  const stack = [];
  for (let i = surroundingAgent.executionContextStack.length - 2; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.VariableEnvironment === undefined && e.Function === Value.null) {
      break;
    }
    stack.push(e.callSite.clone());
    if (e.callSite.isAsync()) {
      i -= 1; // skip original execution context which has no useful information.
    }
  }

  if (stack.length > 0 && stack[0].context.promiseCapability) {
    captureAsyncStack(stack);
  }

  let cache = null;

  X(DefinePropertyOrThrow(O, new Value('stack'), Descriptor({
    Get: CreateBuiltinFunction(() => {
      if (cache === null) {
        let errorString = X(ToString(O)).stringValue();
        stack.forEach((s) => {
          errorString = `${errorString}\n    at ${s.toString()}`;
        });
        cache = new Value(errorString);
      }
      return cache;
    }, []),
    Set: CreateBuiltinFunction(([value = Value.undefined]) => {
      cache = value;
      return Value.undefined;
    }, []),
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}
