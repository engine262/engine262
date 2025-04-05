import type { Protocol } from 'devtools-protocol';
import { ExecutionContext, type GCMarker, surroundingAgent } from './host-defined/engine.mts';
import {
  Value, JSStringValue, ObjectValue, UndefinedValue, NullValue, type PropertyKeyValue,
  SymbolValue,
} from './value.mts';
import {
  Call,
  ToString,
  isFunctionObject,
  isBuiltinFunctionObject,
  isECMAScriptFunctionObject,
} from './abstract-ops/all.mts';
import { Q, X } from './completion.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import type {
  Evaluator, EvaluatorNextType, ValueEvaluator, YieldEvaluator,
} from './evaluator.mts';
import type { ErrorObject } from './intrinsics/Error.mts';

export const kInternal = Symbol('kInternal');

export class JSStringMap<V> implements Map<JSStringValue, V> {
  #map = new Map<string, V>();

  clear() {
    this.#map.clear();
  }

  delete(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.delete(key);
  }

  forEach(callbackfn: (value: V, key: JSStringValue, map: Map<JSStringValue, V>) => void, thisArg?: JSStringMap<V>) {
    this.#map.forEach((value, key) => Reflect.apply(callbackfn, thisArg, [value, typeof key === 'string' ? Value(key) : key, this]));
  }

  get(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.get(key);
  }

  has(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.has(key);
  }

  set(key: JSStringValue | string, value: V): this {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    this.#map.set(key, value);
    return this;
  }

  get size() {
    return this.#map.size;
  }

  * entries() {
    for (const [key, value] of this.#map.entries()) {
      yield [Value(key), value] as [JSStringValue, V];
    }
    return undefined;
  }

  * keys() {
    for (const key of this.#map.keys()) {
      yield Value(key);
    }
    return undefined;
  }

  values() {
    return this.#map.values();
  }

  declare [Symbol.iterator]: () => MapIterator<[JSStringValue, V]>;

  declare [Symbol.toStringTag]: string;

  static {
    JSStringMap.prototype[Symbol.toStringTag] = 'JSStringMap';
    JSStringMap.prototype[Symbol.iterator] = JSStringMap.prototype.entries;
  }

  mark(m: GCMarker) {
    for (const [k, v] of this.#map.entries()) {
      m(k);
      m(v);
    }
  }
}

export class PropertyKeyMap<V> implements Map<PropertyKeyValue, V> {
  #map = new Map<string | SymbolValue, V>();

  clear() {
    this.#map.clear();
  }

  delete(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.delete(key);
  }

  forEach(callbackfn: (value: V, key: PropertyKeyValue, map: Map<PropertyKeyValue, V>) => void, thisArg?: PropertyKeyMap<V>) {
    this.#map.forEach((value, key) => Reflect.apply(callbackfn, thisArg, [value, typeof key === 'string' ? Value(key) : key, this]));
  }

  get(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.get(key);
  }

  has(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.has(key);
  }

  set(key: PropertyKeyValue | string, value: V): this {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    this.#map.set(key, value);
    return this;
  }

  get size() {
    return this.#map.size;
  }

  * entries() {
    for (const [key, value] of this.#map.entries()) {
      if (typeof key === 'string') {
        yield [Value(key), value] as [JSStringValue, V];
      } else {
        yield [key, value] as [SymbolValue, V];
      }
    }
    return undefined;
  }

  * keys() {
    for (const key of this.#map.keys()) {
      if (typeof key === 'string') {
        yield Value(key);
      } else {
        yield key;
      }
    }
    return undefined;
  }

  * values() {
    for (const value of this.#map.values()) {
      yield value;
    }
    return undefined;
  }

  declare [Symbol.iterator]: () => MapIterator<[PropertyKeyValue, V]>;

  declare [Symbol.toStringTag]: string;

  static {
    PropertyKeyMap.prototype[Symbol.toStringTag] = 'PropertyKeyMap';
    PropertyKeyMap.prototype[Symbol.iterator] = PropertyKeyMap.prototype.entries;
  }

  mark(m: GCMarker) {
    for (const [k, v] of this.#map.entries()) {
      m(k);
      m(v);
    }
  }
}

export class JSStringSet {
  #set = new Set<string>();

  constructor(value?: Iterable<JSStringValue | string>) {
    if (value) {
      for (const item of value) {
        this.add(item);
      }
    }
  }

  add(value: JSStringValue | string): this {
    this.#set.add(typeof value === 'string' ? value : value.stringValue());
    return this;
  }

  clear(): void {
    this.#set.clear();
  }

  delete(value: JSStringValue | string): boolean {
    return this.#set.delete(typeof value === 'string' ? value : value.stringValue());
  }

  forEach(callbackfn: (value: JSStringValue, value2: JSStringValue, set: Set<JSStringValue>) => void, thisArg?: JSStringSet): void {
    for (const value of this.#set) {
      Reflect.apply(callbackfn, thisArg, [Value(value), Value(value), this]);
    }
  }

  has(value: JSStringValue | NullValue | string): boolean {
    if (value instanceof NullValue) {
      return false;
    }
    return this.#set.has(typeof value === 'string' ? value : value.stringValue());
  }

  get size() {
    return this.#set.size;
  }

  * entries(): SetIterator<[JSStringValue, JSStringValue]> {
    for (const value of this.#set) {
      yield [Value(value), Value(value)];
    }
    return undefined;
  }

  declare keys: () => SetIterator<JSStringValue>;

  * values() {
    for (const value of this.#set) {
      yield Value(value);
    }
    return undefined;
  }

  declare [Symbol.iterator]: () => SetIterator<JSStringValue>;

  declare [Symbol.toStringTag]: string;

  static {
    JSStringSet.prototype[Symbol.toStringTag] = 'JSStringSet';
    JSStringSet.prototype[Symbol.iterator] = JSStringSet.prototype.values;
    JSStringSet.prototype.keys = JSStringSet.prototype.values;
  }

  mark(_m: GCMarker) { }
}

export class OutOfRange extends RangeError {
  detail: unknown;

  /* c8 ignore next */
  constructor(fn: string, detail: unknown) {
    super(`${fn}() argument out of range`, { cause: detail });
    this.detail = detail;
  }
}

export function skipDebugger<T>(iterator: Evaluator<T>, maxSteps = Infinity): T {
  let steps = 0;
  while (true) {
    const { done, value } = iterator.next({ type: 'debugger-resume', value: undefined });
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

export function* resume(context: ExecutionContext, completion: EvaluatorNextType): YieldEvaluator {
  let result;
  while (true) {
    result = context.codeEvaluationState!.next(completion);
    if (result.done) {
      return result.value;
    }
    const { value } = result;
    if (value.type === 'debugger' || value.type === 'potential-debugger') {
      completion = yield value;
    } else if (value.type === 'await' || value.type === 'async-generator-yield') {
      return Value.undefined;
    } else if (value.type === 'yield') {
      return value.value;
    } else {
      unreachable(value);
    }
  }
}

export class CallSite {
  context: ExecutionContext;

  lastNode: ParseNode | null = null;

  nextNode: ParseNode | null = null;

  lastCallNode: ParseNode.CallExpression | null = null;

  inheritedLastCallNode: ParseNode.CallExpression | null = null;

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
    if (!(this.context.Function instanceof NullValue) && isECMAScriptFunctionObject(this.context.Function) && this.context.Function.ECMAScriptCode) {
      const code = this.context.Function.ECMAScriptCode;
      return code.type === 'AsyncBody' || code.type === 'AsyncGeneratorBody';
    }
    return false;
  }

  isNative() {
    return isBuiltinFunctionObject(this.context.Function);
  }

  getFunctionName(): string | null {
    if (isFunctionObject(this.context.Function)) {
      const name = this.context.Function.properties.get('name');
      if (name && name.Value) {
        return X(ToString(name.Value)).stringValue();
      }
    }
    return null;
  }

  getSpecifier() {
    if (!(this.context.Function instanceof NullValue) && !(this.context.ScriptOrModule instanceof NullValue)) {
      return this.context.ScriptOrModule.HostDefined.specifier;
    }
    return null;
  }

  getScriptId() {
    if (!(this.context.ScriptOrModule instanceof NullValue)) {
      return this.context.ScriptOrModule.HostDefined.scriptId;
    }
    return this.context.HostDefined?.scriptId;
  }

  setLocation(node: ParseNode) {
    this.lastNode = node;
  }

  setNextLocation(node: ParseNode) {
    this.nextNode = node;
  }

  setCallLocation(node: ParseNode.CallExpression | null) {
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

  toCallFrame(): Protocol.Runtime.CallFrame | undefined {
    const source = this.getScriptId();
    if (source === undefined || source === null) {
      return undefined;
    }
    return {
      columnNumber: (this.columnNumber || 1) - 1,
      lineNumber: (this.lineNumber || 1) - 1,
      functionName: this.getFunctionName() || '<anonymous>',
      scriptId: source,
      url: this.getSpecifier() || '<anonymous>',
    };
  }
}

export const kAsyncContext = Symbol('kAsyncContext');

function captureAsyncStack(stack: CallSite[]) {
  let promise = stack[0].context.promiseCapability!.Promise;
  for (let i = 0; i < 10; i += 1) {
    if (promise.PromiseFulfillReactions!.length !== 1) {
      return;
    }
    const [reaction] = promise.PromiseFulfillReactions!;
    if (reaction.Handler && reaction.Handler.Callback[kAsyncContext]) {
      const asyncContext = reaction.Handler.Callback[kAsyncContext];
      stack.push(asyncContext.callSite.clone());
      if ('PromiseState' in asyncContext.promiseCapability!.Promise) {
        promise = asyncContext.promiseCapability!.Promise;
      } else {
        return;
      }
    } else if (!(reaction.Capability instanceof UndefinedValue)) {
      if ('PromiseState' in reaction.Capability.Promise) {
        promise = reaction.Capability.Promise;
      } else {
        return;
      }
    }
  }
}

export function getHostDefinedErrorStack(O: Value) {
  if (O instanceof ObjectValue && 'HostDefinedErrorStack' in O && isArray(O.HostDefinedErrorStack)) {
    return O.HostDefinedErrorStack as readonly CallSite[];
  }
  return undefined;
}

export function getCurrentStack(excludeGlobalStack = true) {
  const stack: CallSite[] = [];
  for (let i = surroundingAgent.executionContextStack.length - (excludeGlobalStack ? 2 : 1); i >= 0; i -= 1) {
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
  return stack;
}

export function captureStack() {
  const stack = getCurrentStack();

  let nativeStack: string | undefined;
  if (surroundingAgent.hostDefinedOptions.errorStackAttachNativeStack) {
    const origStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 12;
    try {
      nativeStack = new Error().stack;
    } finally {
      Error.stackTraceLimit = origStackTraceLimit;
    }
  }

  return {
    stack,
    nativeStack,
  };
}

export function* errorStackToString(O: ErrorObject, stack: readonly CallSite[], nativeStack: string | UndefinedValue = Value.undefined): ValueEvaluator<JSStringValue> {
  let errorString = (Q(yield* Call(surroundingAgent.intrinsic('%Error.prototype.toString%'), O)) as JSStringValue).stringValue();
  stack.forEach((s) => {
    errorString = `${errorString}\n    at ${s.toString()}`;
  });
  if (typeof nativeStack === 'string') {
    errorString = `${errorString}\n    <NATIVE>\n${nativeStack.split('\n').slice(6).join('\n')}`;
  }

  return Value(errorString);
}

export function callable<Class extends object>(
  onCalled = (target: Class, _thisArg: unknown, args: unknown[]) => Reflect.construct(target as new (...args: unknown[]) => unknown, args),
) {
  const handler: ProxyHandler<Class> = Object.freeze({
    __proto__: null,
    apply: onCalled,
  });
  return function decorator(classValue: Class, _classContext: ClassDecoratorContext<Class & (new (...args: readonly unknown[]) => unknown)>) {
    return new Proxy(classValue, handler);
  };
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
}

export const isArray: (arg: unknown) => arg is readonly unknown[] = Array.isArray;
export function unreachable(_: never): never {
  throw new Error('Unreachable');
}
export function __ts_cast__<T>(_value: unknown): asserts _value is T { }
