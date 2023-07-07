// @ts-nocheck
import { ExecutionContext, type GCMarker, surroundingAgent } from './engine.mjs';
import {
  Value, Descriptor, JSStringValue, NumberValue, ObjectValue, UndefinedValue, NullValue,
} from './value.mjs';
import {
  ToString, DefinePropertyOrThrow, CreateBuiltinFunction,
} from './abstract-ops/all.mjs';
import { Completion, X } from './completion.mjs';

export const kInternal = Symbol('kInternal');

function convertValueForKey<T>(key: JSStringValue | NumberValue | T): string | number | T {
  if (key instanceof JSStringValue) {
    return key.stringValue();
  } else if (key instanceof NumberValue) {
    return key.numberValue();
  }
  return key;
}

export class ValueMap<K, V> {
  private map: Map<K, V>;
  constructor() {
    this.map = new Map();
  }

  get size() {
    return this.map.size;
  }

  get(key: K) {
    return this.map.get(convertValueForKey(key));
  }

  set(key: K, value: V) {
    this.map.set(convertValueForKey(key), value);
    return this;
  }

  has(key: K) {
    return this.map.has(convertValueForKey(key));
  }

  delete(key: K) {
    return this.map.delete(convertValueForKey(key));
  }

  * keys() {
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  entries() {
    return this[Symbol.iterator]();
  }

  forEach(cb: (value: V, key: K | JSStringValue | NumberValue, thisValue: ValueMap<K, V>) => void) {
    for (const [key, value] of this.entries()) {
      cb(value, key, this);
    }
  }

  * [Symbol.iterator]() {
    for (const [key, value] of this.map.entries()) {
      if (typeof key === 'string' || typeof key === 'number') {
        yield [Value(key), value] as const;
      } else {
        yield [key, value] as const;
      }
    }
  }

  mark(m: GCMarker) {
    for (const [k, v] of this.entries()) {
      m(k);
      m(v);
    }
  }
}

export class ValueSet<T> {
  private set: Set<T>;
  constructor(init: undefined | null | Iterable<T>) {
    this.set = new Set();
    if (init !== undefined && init !== null) {
      for (const item of init) {
        this.add(item);
      }
    }
  }

  get size() {
    return this.set.size;
  }

  add(item: T) {
    this.set.add(convertValueForKey(item));
    return this;
  }

  has(item: T) {
    return this.set.has(convertValueForKey(item));
  }

  delete(item: T) {
    return this.set.delete(convertValueForKey(item));
  }

  values() {
    return this[Symbol.iterator]();
  }

  * [Symbol.iterator]() {
    for (const key of this.set.values()) {
      if (typeof key === 'string' || typeof key === 'number') {
        yield Value(key);
      } else {
        yield key;
      }
    }
  }

  mark(m: GCMarker) {
    for (const v of this.values()) {
      m(v);
    }
  }
}

export class OutOfRange extends RangeError {
  detail: unknown;
  /* c8 ignore next */
  constructor(fn: string, detail: unknown) {
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
    /* c8 ignore next */
    steps += 1;
    if (steps > maxSteps) {
      throw new RangeError('Max steps exceeded');
    }
  }
}

const kSafeToResume = Symbol('kSameToResume');

export function handleInResume<T extends((...arg: Args) => Return), Args extends unknown[], Return>(fn: T, ...args: Args) {
  const bound = () => fn(...args);
  Reflect.set(bound, kSafeToResume, true);
  return bound;
}

export function resume(context: ExecutionContext, completion: Completion) {
  const { value } = context.codeEvaluationState.next(completion);
  if (typeof value === 'function' && value[kSafeToResume] === true) {
    return X(value());
  }
  return value;
}

export class CallSite {
  context: ExecutionContext;
  lastNode = null;
  lastCallNode = null;
  inheritedLastCallNode = null;
  constructCall = false;
  constructor(context: ExecutionContext) {
    this.context = context;
  }

  clone(context = this.context) {
    const c = new CallSite(context);
    c.lastNode = this.lastNode;
    c.lastCallNode = this.lastCallNode;
    c.inheritedLastCallNode = this.inheritedLastCallNode;
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
    if (!(this.context.Function instanceof NullValue) && this.context.Function.ECMAScriptCode) {
      const code = this.context.Function.ECMAScriptCode;
      return code.type === 'AsyncBody' || code.type === 'AsyncGeneratorBody';
    }
    return false;
  }

  isNative() {
    return !!(this.context.Function as FunctionObjectValue).nativeFunction;
  }

  getFunctionName() {
    if (!(this.context.Function instanceof NullValue)) {
      const name = this.context.Function.properties.get(Value('name'));
      if (name) {
        return X(ToString(name.Value)).stringValue();
      }
    }
    return null;
  }

  getSpecifier() {
    if (!(this.context.Function instanceof NullValue)) {
      return this.context.ScriptOrModule.HostDefined.specifier;
    }
    return null;
  }

  setLocation(node) {
    this.lastNode = node;
  }

  setCallLocation(node) {
    this.lastCallNode = node;
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

    let visualFunctionName;
    if (this.inheritedLastCallNode?.CallExpression.type === 'IdentifierReference') {
      visualFunctionName = this.inheritedLastCallNode.CallExpression.name;
    }
    if (visualFunctionName === functionName) {
      visualFunctionName = undefined;
    }

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
      if (visualFunctionName) {
        string += ` (as ${visualFunctionName})`;
      }
    } else if (functionName) {
      string += functionName;
      if (visualFunctionName) {
        string += ` (as ${visualFunctionName})`;
      }
    } else {
      return `${string}${this.loc()}`;
    }

    return `${string} (${this.loc()})`;
  }
}

export const kAsyncContext = Symbol('kAsyncContext');

function captureAsyncStack(stack: CallSite[]) {
  let promise = stack[0].context.promiseCapability.Promise;
  for (let i = 0; i < 10; i += 1) {
    if (promise.PromiseFulfillReactions.length !== 1) {
      return;
    }
    const [reaction] = promise.PromiseFulfillReactions;
    if (reaction.Handler && reaction.Handler.Callback[kAsyncContext]) {
      const asyncContext = reaction.Handler.Callback[kAsyncContext];
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

export function captureStack(O: ObjectValue) {
  const stack: CallSite[] = [];
  for (let i = surroundingAgent.executionContextStack.length - 2; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.VariableEnvironment === undefined && e.Function === Value.null) {
      break;
    }
    const clone = e.callSite.clone();
    const parent = stack[stack.length - 1];
    if (parent && !parent.context.poppedForTailCall) {
      parent.inheritedLastCallNode = clone.lastCallNode;
    }
    stack.push(clone);
    if (e.callSite.isAsync()) {
      i -= 1; // skip original execution context which has no useful information.
    }
  }

  if (stack.length > 0 && stack[0].context.promiseCapability) {
    captureAsyncStack(stack);
  }

  let cache: null | JSStringValue | UndefinedValue = null;

  const name = Value('stack');
  X(DefinePropertyOrThrow(O, name, Descriptor({
    Get: CreateBuiltinFunction(() => {
      if (cache === null) {
        let errorString = X(ToString(O)).stringValue();
        stack.forEach((s) => {
          errorString = `${errorString}\n    at ${s.toString()}`;
        });
        cache = Value(errorString);
      }
      return cache;
    }, 0, name, [], undefined, undefined, Value('get')),
    Set: CreateBuiltinFunction(([value = Value.undefined]) => {
      cache = value;
      return Value.undefined;
    }, 1, name, [], undefined, undefined, Value('set')),
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

export function callable<Class extends object>(onCalled = (target: Class, _thisArg: unknown, args: unknown[]) => Reflect.construct(target, args)) {
  return function decoartor(classValue: Class, _classContext: ClassDecoratorContext<Class>) {
    return new Proxy(classValue, {
      apply: onCalled,
    });
  };
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}

export const isArray: (arg: unknown) => arg is readonly unknown[] = Array.isArray;
export function unreachable(_: never): never {
  throw new Error('Unreachable');
}
