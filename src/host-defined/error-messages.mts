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
'"day" is required'
  | '"month-code" or "month" is required'
  | '"year" is required'
  | 'Array length must be uint32.'
  | 'Array length too big.'
  | 'BigInt has no unsigned right shift, use >> instead'
  | 'Calendars are not equal'
  | 'Cannot add a date to an instant'
  | 'Cannot call addInitializer after decoration is finished'
  | 'Cannot define private element to a non-extensible object'
  | 'Cannot divide by zero'
  | 'Cannot resize ArrayBuffer to bigger than maxByteLength'
  | 'DateTime outside of range'
  | 'Decorators can only be used to decorate classes'
  | 'Decorators cannot appear on both sides of the export keyword'
  | 'Exponent of bigint must be positive'
  | 'ISODate is out of range'
  | 'Invalid date'
  | 'Invalid duration'
  | 'Invalid leap month'
  | 'Invalid month'
  | 'Invalid receiver'
  | 'Invalid time'
  | 'Multiple possible epoch nanoseconds'
  | 'No matching offset found for the given date and time'
  | 'No possible epoch nanoseconds'
  | 'Offset is out of bound'
  | 'Options parameter is required'
  | 'PlainDateTime outside of range'
  | 'PlainMonthDay out of range'
  | 'PlainYearMonth calendars do not match'
  | 'PlainYearMonth out of range'
  | 'RegExp flags "v" and "u" cannot be used together'
  | 'Resulting ISODate is out of range'
  | 'Resulting date-time is out of range'
  | 'Temporal.Duration cannot be converted to primitive value. If you are comparing two Temporal.Duration objects with > or <, use Temporal.Duration.compare() instead.'
  | 'Temporal.Duration constructor cannot be called without new'
  | 'Temporal.Instant cannot be called without new'
  | 'Temporal.Instant cannot be converted to primitive value If you are comparing two Temporal.Duration objects with > or <, use Temporal.Instant.compare() instead.'
  | 'Temporal.PlainDate cannot be converted to primitive value. If you are comparing two Temporal.PlainDate objects with > or <, use Temporal.PlainDate.compare() instead.'
  | 'Temporal.PlainDate constructor cannot be called without new'
  | 'Temporal.PlainDateTime cannot be called without new'
  | 'Temporal.PlainDateTime cannot be converted to primitive value. If you are comparing two Temporal.PlainDateTime objects with > or <, use Temporal.PlainDateTime.compare() instead.'
  | 'Temporal.PlainMonthDay cannot be called without new'
  | 'Temporal.PlainMonthDay cannot be converted to primitive value. If you are comparing two Temporal.PlainMonthDay objects with > or <, use Temporal.PlainMonthDay.compare() instead.'
  | 'Temporal.PlainTime cannot be called without new'
  | 'Temporal.PlainTime cannot be converted to primitive value. If you are comparing two Temporal.PlainTime objects with > or <, use Temporal.PlainTime.compare() instead.'
  | 'Temporal.PlainYearMonth cannot be called without new'
  | 'Temporal.PlainYearMonth cannot be converted to primitive value. If you are comparing two Temporal.PlainYearMonth objects with > or <, use Temporal.PlainYearMonth.compare() instead.'
  | 'Temporal.ZonedDateTime cannot be called without new'
  | 'Temporal.ZonedDateTime cannot be converted to primitive value. If you are comparing two Temporal.ZonedDateTime objects with > or <, use Temporal.ZonedDateTime.compare() instead.'
  | 'Time zones are not equal'
  | 'TypedArray out of bounds'
  | 'calendar is not a string'
  | 'directionParam is required'
  | 'largestUnit must be larger than smallestUnit'
  | 'relativeTo is required for calendar units'
  | 'relativeTo option is required when comparing durations with calendar units'
  | 'roundTo is required'
  | 'roundingIncrement must be 1 when rounding a date unit to a larger unit'
  | 'smallestUnit and largestUnit cannot both be omitted'
  | 'smallestUnit cannot be hour'
  | 'smallestUnit cannot be hour or minute'
  | 'timeZone is not a string'
  | 'totalOf is required'
  ): ThrowCompletion;
  (m:
'"roundingIncrement" ($1) is out of range'
  | '$1 cannot be used as a WeakMap key'
  | '$1 does not look like a TemporalTimeLike object'
  | '$1 is not a TemporalTimeLike object'
  | '$1 is not a constructor'
  | '$1 is not a function'
  | '$1 is not a partial Temporal object'
  | '$1 is not a string'
  | '$1 is not a supported calendar'
  | '$1 is not a valid epoch nanoseconds'
  | '$1 is not an integral number'
  | '$1 is not an object'
  | '$1 is not the [[ArrayBufferDetachKey]] of the given ArrayBuffer'
  | 'Accessor decorator must return an object or undefined, but $1 was returned'
  | 'Cannot mix BigInt and other types in $1 operation'
  | 'Class decorator must return a function or undefined, but $1 was returned'
  | 'Field decorator must return a function or undefined, but $1 was returned'
  | 'Invalid TemporalUnit value $1'
  | 'Invalid time string $1'
  | 'Invalid time zone identifier: $1'
  | 'Method decorator must return a function or undefined, but $1 was returned'
  | 'Private field $1 is not a getter'
  | 'Private field $1 is not a setter'
  | 'Private method $1 cannot be set'
  | 'The get property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'The init property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'The set property of the return value of an accessor decorator must be a function or undefined, but $1 was returned'
  | 'addInitializer must be called with a function, but $1 was passed'
  | 'calendar must be a string, but $1'
  | 'invalid time zone identifier: $1'
  | 'temporalCalendarLike must be a string or a Temporal object, but got $1'
  , $1: Formattable): ThrowCompletion;
  (m:
'"$1" is required on object $2'
  | '$1 does not exist on $2'
  | '$1 is a required on object $2'
  | '$1 is not a $2'
  | 'Private element $1 is already defined on $2'
  , $1: Formattable, $2: Formattable): ThrowCompletion;
  (m:
'"$1" on object $2 is not valid ($3)'
  | '$1-$2-$3 is not a valid date'
  , $1: Formattable, $2: Formattable, $3: Formattable): ThrowCompletion;
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
