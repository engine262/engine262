import { surroundingAgent } from './engine.mjs';
import { Value, Descriptor } from './value.mjs';
import { ToString, DefinePropertyOrThrow, CreateBuiltinFunction } from './abstract-ops/all.mjs';
import { X, AwaitFulfilledFunctions } from './completion.mjs';
import { inspect } from './api.mjs';

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
    this.lineNumber = null;
    this.columnNumber = null;
    this.constructCall = false;
  }

  clone(context = this.context) {
    const c = new CallSite(context);
    c.lineNumber = this.lineNumber;
    c.columnNumber = this.columnNumber;
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
    const { line, column } = node.loc.start;
    this.lineNumber = line;
    this.columnNumber = column;
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
    const isMethodCall = !(this.isTopLevel() || this.isConstructCall());

    let string = isAsync ? 'async ' : '';

    if (isMethodCall) {
      if (functionName) {
        string += functionName;
      } else {
        string += '<anonymous>';
      }
    } else if (this.isConstructCall()) {
      string += 'new ';
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
    if (e.VariableEnvironment === undefined) {
      break;
    }
    stack.push(e.callSite.clone());
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

function inlineInspect(V) {
  if (V instanceof Value) {
    return inspect(V, surroundingAgent.currentRealmRecord, true);
  }
  return `${V}`;
}

const messages = {
  AlreadyDeclared: (n) => `${inlineInspect(n)} is already declared`,
  ArrayPastSafeLength: () => 'Cannot make length of array-like object surpass the bounds of an integer index',
  BufferDetachKeyMismatch: (k, b) => `${inlineInspect(k)} is not the [[ArrayBufferDetachKey]] of ${inlineInspect(b)}`,
  BufferDetached: () => 'Cannot operate on detached ArrayBuffer',
  CannotConvertSymbol: (t) => `Cannot convert a Symbol value to a ${t}`,
  CannotConvertToObject: (t) => `Cannot convert ${t} to object`,
  CannotSetProperty: (p, o) => `Cannot set property ${inlineInspect(p)} on ${inlineInspect(o)}`,
  ConstructorRequiresNew: (n) => `${n} constructor requires new`,
  CouldNotResolveModule: (s) => `Could not resolve module ${inlineInspect(s)}`,
  DataViewOOB: () => 'Offset is outside the bounds of the DataView',
  InternalSlotMissing: (o, s) => `Internal slot ${s} is missing for ${inlineInspect(o)}`,
  InvalidHint: (v) => `Invalid hint: ${inlineInspect(v)}`,
  InvalidRegExpFlags: (f) => `Invalid RegExp flags: ${f}`,
  NegativeIndex: (n = 'Index') => `${n} cannot be negative`,
  NotAConstructor: (v) => `${inlineInspect(v)} is not a constructor`,
  NotAFunction: (v) => `${inlineInspect(v)} is not a function`,
  NotATypeObject: (t, v) => `${inlineInspect(v)} is not a ${t} object`,
  NotAnObject: (v) => `${inlineInspect(v)} is not an object`,
  NotAnTypeObject: (t, v) => `${inlineInspect(v)} is not an ${t} object`,
  NotDefined: (n) => `${inlineInspect(n)} is not defined`,
  ObjectToPrimitive: () => 'Cannot convert object to primitive value',
  OutOfRange: (n) => `${n} is out of range`,
  PromiseRejectFunction: (v) => `Promise reject function ${inlineInspect(v)} is not callable`,
  PromiseResolveFunction: (v) => `Promise resolve function ${inlineInspect(v)} is not callable`,
  ProxyRevoked: (n) => `Cannot perform '${n}' on a proxy that has been revoked`,
  RegExpArgumentNotAllowed: (m) => `First argument to ${m} must not be a regular expression`,
  ResolutionNullOrAmbiguous: (r, n, m) => (r === null
    ? `Could not resolve import ${inlineInspect(n)} from ${m.HostDefined.specifier}`
    : `Star export ${inlineInspect(n)} from ${m.HostDefined.specifier} is ambiguous`),
  StrictModeDelete: (n) => `Cannot not delete property ${inlineInspect(n)}`,
  StringRepeatCount: (v) => `Count ${inlineInspect(v)} is invalid`,
  SubclassLengthTooSmall: (v) => `Subclass constructor returned a smaller-than-requested object ${inlineInspect(v)}`,
  SubclassSameValue: (v) => `Subclass constructor returned the same object ${inlineInspect(v)}`,
  TypedArrayCreationOOB: () => 'Sum of start offset and byte length should be less than the size of underlying buffer',
  TypedArrayLengthAlignment: (n, m) => `Size of ${n} should be a multiple of ${m}`,
  TypedArrayOOB: () => 'Sum of start offset and byte length should be less than the size of the TypedArray',
  TypedArrayOffsetAlignment: (n, m) => `Start offset of ${n} should be a multiple of ${m}`,
  TypedArrayTooSmall: () => 'Derived TypedArray constructor created an array which was too small',
};

export function msg(key, ...args) {
  return messages[key](...args);
}
