import { surroundingAgent } from './engine.mjs';
import { Value, Descriptor, ModuleRecord } from './value.mjs';
import { ToString, DefinePropertyOrThrow } from './abstract-ops/all.mjs';
import { X } from './completion.mjs';
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

export function captureStack(O) {
  const stack = surroundingAgent.executionContextStack
    .filter((e) => e.Function !== Value.null)
    .map((e) => {
      let string = '\n  at ';
      const functionName = e.Function.properties.get(new Value('name'));
      if (functionName) {
        string += X(ToString(functionName.Value)).stringValue();
      } else {
        string += '<anonymous>';
      }
      if (e.ScriptOrModule instanceof ModuleRecord) {
        string += e.ScriptOrModule.HostDefined.specifier;
      }
      return string;
    })
    .reverse();

  const errorString = X(ToString(O)).stringValue();
  const trace = `${errorString}${stack.join('')}`;

  X(DefinePropertyOrThrow(O, new Value('stack'), Descriptor({
    Value: new Value(trace),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
}

function inlineInspect(V) {
  return inspect(V, surroundingAgent.currentRealmRecord, true);
}

const messages = {
  AlreadyDeclared: (n) => `${inlineInspect(n)} is already declared`,
  ArrayPastSafeLength: () => 'Cannot make length of array-like object surpass the bounds for a safe integer',
  BufferDetachKeyMismatch: (k, b) => `${inlineInspect(k)} is not the [[ArrayBufferDetachKey]] of ${inlineInspect(b)}`,
  BufferDetached: () => 'Cannot operate on detached ArrayBuffer',
  CannotConvertSymbol: (t) => `Can not convert a Symbol value to a ${t}`,
  CannotConvertToObject: (t) => `Can not convert ${t} to object`,
  CannotSetProperty: (p, o) => `Cannot set property ${inlineInspect(p)} on ${inlineInspect(o)}`,
  ConstructorRequiresNew: (n) => `${n} constructor requires new`,
  CouldNotResolveModule: (s) => `Could not resolve module ${inlineInspect(s)}`,
  DataViewOOB: () => 'Offset is outside the bounds of the DataView',
  IncompatibleReceiver: (m) => `${m} called on incompatible receiver`,
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
