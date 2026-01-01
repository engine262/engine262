import { unreachable } from '../helpers.mts';
import * as messages from '../messages.mts';
import { R } from '../abstract-ops/all.mjs';
import { isBooleanObject } from '../intrinsics/Boolean.mts';
import { isNumberObject } from '../intrinsics/Number.mts';
import { isBigIntObject } from '../intrinsics/BigInt.mts';
import { isStringObject } from '../intrinsics/String.mts';
import { isSymbolObject } from '../intrinsics/Symbol.mts';
import {
  BigIntValue,
  BooleanValue,
  Construct, CreateArrayFromList, EscapeRegExpPattern, isArrayBufferObject, isArrayExoticObject, isDateObject, isErrorObject, isFunctionObject, isModuleNamespaceObject, isPromiseObject, isRegExpObject, isTypedArrayObject, JSStringValue, NullValue, NumberValue, ObjectValue, PrivateName, surroundingAgent, SymbolValue, ThrowCompletion, UndefinedValue, Value, X,
  type Intrinsics,
} from '#self';

export type ErrorType = 'AggregateError' | 'TypeError' | 'Error' | 'SyntaxError' | 'RangeError' | 'ReferenceError' | 'URIError';

/** @deprecated Use ThrowCompletion */
export function Throw(value: Value): ThrowCompletion;
/** @deprecated Use concrete methods like Throw.TypeError */
export function Throw(errorType: ErrorType, template: string, ...messages: unknown[]): ThrowCompletion;
/** @deprecated Use concrete methods like Throw.TypeError */
export function Throw(value: Value | ErrorType, template?: string, ...templateArgs: unknown[]): ThrowCompletion {
  if (value instanceof Value) {
    return ThrowCompletion(value);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message = ((messages as any)[template!] as (...args: unknown[]) => string)(...templateArgs);
  const cons = surroundingAgent.intrinsic(`%${value}%`);
  let error;
  if (value === 'AggregateError') {
    error = X(Construct(cons, [
      X(CreateArrayFromList([])),
      Value(message),
    ]));
  } else {
    error = X(Construct(cons, [Value(message)]));
  }
  return ThrowCompletion(error);
}

function ThrowFactory(intrinsicName: keyof Intrinsics & `%${string}Error%`): Throw {
  return (message: string, ...args: Formattable[]) => {
    message = message.replace(/\$(\d+)/g, (_, n) => {
      const index = Number(n) - 1;
      if (index < 0 || index >= args.length) {
        throw new RangeError('Insufficient arguments for format string');
      }
      const arg = args[index];
      return format(arg);
    });
    if (intrinsicName === '%AggregateError%') {
      const E = X(Construct(surroundingAgent.intrinsic(intrinsicName), [X(CreateArrayFromList([])), Value(message)]));
      return ThrowCompletion(E);
    } else {
      const E = X(Construct(surroundingAgent.intrinsic(intrinsicName), [Value(message)]));
      return ThrowCompletion(E);
    }
  };
}
Throw.EvalError = ThrowFactory('%EvalError%');
Throw.RangeError = ThrowFactory('%RangeError%');
Throw.ReferenceError = ThrowFactory('%ReferenceError%');
Throw.SyntaxError = ThrowFactory('%SyntaxError%');
Throw.TypeError = ThrowFactory('%TypeError%');
Throw.URIError = ThrowFactory('%URIError%');
Throw.Error = ThrowFactory('%Error%');
Throw.AggregateError = ThrowFactory('%AggregateError%');

export type Formattable = string | number | bigint | Value | PrivateName | Formattable[];
export function format(arg: Formattable): string {
  switch (true) {
    case typeof arg !== 'object':
      return String(arg);
    case arg instanceof PrivateName:
      return `#${arg.Description instanceof UndefinedValue ? '' : arg.Description.stringValue()}`;
    case arg instanceof JSStringValue:
      return JSON.stringify(arg.stringValue());
    case arg instanceof NumberValue: {
      const n = R(arg);
      if (n === 0 && Object.is(n, -0)) {
        return '-0';
      }
      return n.toString();
    }
    case arg instanceof BigIntValue:
      return `${String(R(arg))}n`;
    case arg instanceof SymbolValue:
      return `Symbol(${arg.Description instanceof UndefinedValue ? '' : arg.Description.stringValue()})`;
    case arg instanceof NullValue:
      return 'null';
    case arg instanceof UndefinedValue:
      return 'undefined';
    case arg instanceof BooleanValue:
      return String(arg.booleanValue());
    case arg instanceof ObjectValue: {
      if (isPromiseObject(arg)) {
        return '[object Promise]';
      }
      if (isModuleNamespaceObject(arg)) {
        return '[object Module]';
      }
      if (isFunctionObject(arg)) {
        const name = arg.properties.get('name');
        if (name && name.Value instanceof JSStringValue && name.Value.stringValue() !== '') {
          return `[Function ${name.Value.stringValue()}]`;
        }
        return '[Function]';
      }
      if (isErrorObject(arg)) {
        return '[object Error]';
      }
      if (isRegExpObject(arg)) {
        const P = EscapeRegExpPattern(arg.OriginalSource, arg.OriginalFlags).stringValue();
        const F = arg.OriginalFlags.stringValue();
        return `/${P}/${F}`;
      }
      if (isDateObject(arg)) {
        const d = new Date(R(arg.DateValue));
        if (Number.isNaN(d.getTime())) {
          return '[Date Invalid]';
        }
        return `[Date ${d.toISOString()}]`;
      }
      if (isBooleanObject(arg)) {
        return `[Boolean ${format(arg.BooleanData)}]`;
      }
      if (isNumberObject(arg)) {
        return `[Number ${format(arg.NumberData)}]`;
      }
      if (isBigIntObject(arg)) {
        return `[BigInt ${format(arg.BigIntData)}]`;
      }
      if (isStringObject(arg)) {
        return `[String ${format(arg.StringData)}]`;
      }
      if (isSymbolObject(arg)) {
        return `[Symbol ${format(arg.SymbolData)}]`;
      }
      if (isArrayExoticObject(arg)) {
        return '[object Array]';
      }
      if (isTypedArrayObject(arg)) {
        return `[object ${arg.TypedArrayName}]`;
      }
      if (isArrayBufferObject(arg)) {
        return '[object ArrayBuffer]';
      }
      return '[object Object]';
    }
    case Array.isArray(arg):
      return `[${arg.map(format).join(', ')}]`;
    default:
      return unreachable(arg);
  }
}

export interface Throw {
  // auto-generate start
  (m:
'Array length must be uint32.'
  | 'Array length too big.'
  | 'BigInt has no unsigned right shift, use >> instead'
  | 'Cannot call addInitializer after decoration is finished'
  | 'Cannot define private element to a non-extensible object'
  | 'Cannot divide by zero'
  | 'Cannot resize ArrayBuffer to bigger than maxByteLength'
  | 'Decorators can only be used to decorate classes'
  | 'Decorators cannot appear on both sides of the export keyword'
  | 'Exponent of bigint must be positive'
  | 'Invalid receiver'
  | 'Offset is out of bound'
  | 'RegExp flags "v" and "u" cannot be used together'
  | 'TypedArray out of bounds'
  ): ThrowCompletion;
  (m:
'$1 cannot be used as a WeakMap key'
  | '$1 is not a constructor'
  | '$1 is not a function'
  | '$1 is not the [[ArrayBufferDetachKey]] of the given ArrayBuffer'
  | 'Accessor decorator must return an object or undefined, but $1 was returned'
  | 'Cannot mix BigInt and other types in $1 operation'
  | 'Class decorator must return a function or undefined, but $1 was returned'
  | 'Field decorator must return a function or undefined, but $1 was returned'
  | 'Method decorator must return a function or undefined, but $1 was returned'
  | 'Private field $1 is not a getter'
  | 'Private field $1 is not a setter'
  | 'Private method $1 cannot be set'
  | 'The get property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'The init property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'The set property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'addInitializer must be called with a function, but $1 was passed'
  , $1: Formattable): ThrowCompletion;
  (m:
'$1 does not exist on $2'
  | '$1 is not a $2'
  | 'Private element $1 is already defined on $2'
  , $1: Formattable, $2: Formattable): ThrowCompletion;
  // auto-generate end
  <const S extends string>(m: S, ...args: ParsePrintFormat<S>): ThrowCompletion;
}

// thanks https://github.com/type-challenges/type-challenges/blob/main/questions/00147-hard-c-printf-parser/README.md
type ParametersMap = {
  '1': Formattable;
  '2': Formattable;
  '3': Formattable;
}
type ParsePrintFormat<S extends string> = S extends `${string}$${infer T}${infer End}` ? T extends keyof ParametersMap ? [ParametersMap[T], ...ParsePrintFormat<End>] : ParsePrintFormat<End> : []
