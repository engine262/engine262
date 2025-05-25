import {
  BigIntValue, BooleanValue, Descriptor,
  JSStringValue, NullValue, NumberValue,
  ObjectValue, PrimitiveValue, SymbolValue, UndefinedValue,
  Value, wellKnownSymbols,
  type PropertyKeyValue,
} from '../value.mts';
import {
  Assert, EscapeRegExpPattern,
  IsAccessorDescriptor, isArrayExoticObject,
  isArrayIndex, IsCallable, IsDataDescriptor,
  isECMAScriptFunctionObject, IsError,
  LengthOfArrayLike, R, Realm,
  type FunctionObject,
} from '../abstract-ops/all.mts';
import { Completion, X, type ValueCompletion } from '../completion.mts';
import { isRegExpObject } from '../intrinsics/RegExp.mts';
import { isDateObject } from '../intrinsics/Date.mts';
import { isBooleanObject } from '../intrinsics/Boolean.mts';
import type { NumberObject } from '../intrinsics/Number.mts';
import { isBigIntObject } from '../intrinsics/BigInt.mts';
import type { StringObject } from '../intrinsics/String.mts';
import type { SymbolObject } from '../intrinsics/Symbol.mts';
import { isPromiseObject } from '../intrinsics/Promise.mts';
import { isProxyExoticObject } from '../intrinsics/Proxy.mts';
import { isTypedArrayObject } from '../intrinsics/TypedArray.mts';
import { __ts_cast__, OutOfRange } from '../helpers.mts';
import { surroundingAgent } from './engine.mts';
import { getNoSideEffects } from './internal-util.mts';

const bareKeyRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

const OBJECT_BRACES: readonly [open: '{', close: '}'] = ['{', '}'];
const ARRAY_BRACES: readonly [open: '[', close: ']'] = ['[', ']'];

type Style =
  | 'bigint'
  | 'boolean'
  | 'date'
  | 'hidden'
  | 'internalSlot'
  | 'module'
  | 'name'
  | 'number'
  | 'regexp'
  | 'string'
  | 'symbol'
  | 'special'
  | 'null'
  | 'undefined';

type Stylizer = (text: string, style: Style) => string;
const stylizeNoColor: Stylizer = (text) => text;

function getConstructorName(v: ObjectValue) {
  Assert(!isProxyExoticObject(v));

  let firstProto;
  let obj: ObjectValue | NullValue = v;
  do {
    try {
      const desc = X(obj.GetOwnProperty(Value('constructor')));
      if (IsDataDescriptor(desc) && (desc.Value instanceof ObjectValue) && !isProxyExoticObject(desc.Value)) {
        const name = X(getNoSideEffects(desc.Value, Value('name')));
        if (name instanceof JSStringValue) {
          return name.stringValue();
        }
      }
    } catch {}

    obj = X(obj.GetPrototypeOf());
    if (!firstProto) {
      firstProto = obj;
    }
  } while (obj instanceof ObjectValue && !isProxyExoticObject(obj));

  if (firstProto === Value.null) {
    return null;
  }

  return getBuiltinConstructorName(v);
}

function getBuiltinConstructorName(v: ObjectValue) {
  if (IsCallable(v)) {
    return getFunctionType(v);
  }
  if (isTypedArrayObject(v)) {
    return v.TypedArrayName.stringValue();
  }
  if (isArrayExoticObject(v)) {
    return 'Array';
  }
  if ('PromiseState' in v) {
    return 'Promise';
  }
  if ('ErrorData' in v) {
    return 'Error';
  }
  if ('RegExpMatcher' in v) {
    return 'RegExp';
  }
  if ('BooleanData' in v) {
    return 'Boolean';
  }
  if ('NumberData' in v) {
    return 'Number';
  }
  if ('BigIntData' in v) {
    return 'BigInt';
  }
  if ('StringData' in v) {
    return 'String';
  }
  if ('SymbolData' in v) {
    return 'Symbol';
  }
  return 'Object';
}

function getFunctionType(func: FunctionObject) {
  if (!isECMAScriptFunctionObject(func)) {
    return 'Function';
  }

  switch (func.ECMAScriptCode?.type) {
    case 'AsyncBody':
    case 'AsyncConciseBody':
      return 'AsyncFunction';
    case 'AsyncGeneratorBody':
      return 'AsyncGeneratorFunction';
    case 'GeneratorBody':
      return 'GeneratorFunction';
    default:
      return 'Function';
  }
}

function getKeys(O: ObjectValue, includeNonEnumerable = false) {
  Assert(!isProxyExoticObject(O));

  const ownKeys = X(O.OwnPropertyKeys());
  if (includeNonEnumerable) {
    return ownKeys;
  }

  const properties: PropertyKeyValue[] = [];
  for (const key of ownKeys) {
    try {
      const desc = X(O.GetOwnProperty(key));
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === Value.true) {
        properties.push(key);
      }
    } catch {}
  }

  return properties;
}

const formatProperty = ((desc: Descriptor, ctx, i) => {
  if (IsDataDescriptor(desc)) {
    return i(desc.Value);
  } else {
    Assert(IsAccessorDescriptor(desc));
    let label;
    if (desc.Get !== Value.undefined) {
      label = desc.Set === Value.undefined ? 'Getter' : 'Getter/Setter';
    } else {
      label = 'Setter';
    }
    return (ctx.stylize(`[${label}]`, 'special'));
  }
}) satisfies Inspector;

/* eslint-disable no-control-regex */
const strEscapeSequencesReplacer = /[\x00-\x1f\x27\x5c\x7f-\x9f]/g;
const strEscapeSequencesReplacerIgnoreQuotes = /[\x00-\x1f\x5c\x7f-\x9f]/g;
/* eslint-enable no-control-regex */

// Escaped control characters (plus the single quote and the backslash):
const strEscapeArray = [
  /* x00 - x07: */ '\\x00', '\\x01', '\\x02', '\\x03', '\\x04', '\\x05', '\\x06', '\\x07',
  /* x08 - x0F: */ '\\b', '\\t', '\\n', '\\x0B', '\\f', '\\r', '\\x0E', '\\x0F',
  /* x10 - x17: */ '\\x10', '\\x11', '\\x12', '\\x13', '\\x14', '\\x15', '\\x16', '\\x17',
  /* x18 - x1F: */ '\\x18', '\\x19', '\\x1A', '\\x1B', '\\x1C', '\\x1D', '\\x1E', '\\x1F',
  /* x20 - x2F: */ '', '', '', '', '', '', '', "\\'", '', '', '', '', '', '', '', '',
  /* x30 - x3F: */ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  /* x40 - x4F: */ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  /* x50 - x5F: */ '', '', '', '', '', '', '', '', '', '', '', '', '\\\\', '', '', '',
  /* x60 - x6F: */ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
  /* x70 - x7F: */ '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '\\x7F',
  /* x80 - x87: */ '\\x80', '\\x81', '\\x82', '\\x83', '\\x84', '\\x85', '\\x86', '\\x87',
  /* x88 - x8F: */ '\\x88', '\\x89', '\\x8A', '\\x8B', '\\x8C', '\\x8D', '\\x8E', '\\x8F',
  /* x90 - x97: */ '\\x90', '\\x91', '\\x92', '\\x93', '\\x94', '\\x95', '\\x96', '\\x97',
  /* x98 - x9F: */ '\\x98', '\\x99', '\\x9A', '\\x9B', '\\x9C', '\\x9D', '\\x9E', '\\x9F',
];

// TODO: Handle unpaired surrogates
const escapeFn = (str: string) => strEscapeArray[str.charCodeAt(0)];

// Roughly based on the JSON stringify escaping.
function strEscape(str: string) {
  let replacer = strEscapeSequencesReplacer;
  let quote = 0x27;

  if (str.includes("'")) {
    if (!str.includes('"')) {
      // If the string contains single quotes and not double quotes,
      // then we wrap it in double quotes:
      quote = -1;
    }

    if (quote !== 0x27) {
      replacer = strEscapeSequencesReplacerIgnoreQuotes;
    }
  }

  str = str.replace(replacer, escapeFn);
  switch (quote) {
    case -1:
      return `"${str}"`;

    case 0x27:
      return `'${str}'`;

    default:
      throw new OutOfRange(`strEscape: Invalid quote code point: ${quote}`, quote);
  }
}

function getPrefix(constructor: string | null, tag: string, type: string, size = '') {
  let prefix;
  if (constructor === null) {
    prefix = `[${type}${size}: null prototype] `;
  } else if (type !== 'Object') {
    prefix = `${type}${size} `;
    if (constructor && constructor !== type) {
      prefix += `(${constructor}) `;
    }
  } else {
    prefix = `${constructor}${size} `;
  }

  if (tag !== '' && tag !== constructor && tag !== type) {
    prefix += `[${tag}] `;
  }

  return prefix;
}

function getBoxedBase(
  type: 'Date' | PrimitiveValue['type'],
  value: PrimitiveValue | string,
  ctx: InspectContext,
  i: (v: Value) => string,
  constructor: string | null,
  tag: string,
) {
  let base = `[${type}`;
  if (type !== constructor) {
    if (constructor !== null) {
      base += ` (${constructor})`;
    } else {
      base += ' (null prototype)';
    }
  }

  const os = ctx.stylize;
  ctx.stylize = stylizeNoColor;
  base += `: ${typeof value === 'string' ? value : i(value)}]`;
  ctx.stylize = os;

  if (tag !== '' && tag !== constructor && tag !== type) {
    base += ` [${tag}]`;
  }

  return ctx.stylize(base, type.toLowerCase() as Lowercase<typeof type>);
}

function getFunctionBase(v: FunctionObject, constructor: string | null, tag: string) {
  const type = getFunctionType(v);
  let base = `[${type}`;
  if (constructor === null) {
    base += ' (null prototype)';
  }

  const nameProp = v.properties.get('name');
  let nameStr = '';
  if (nameProp) {
    if (IsDataDescriptor(nameProp) && nameProp.Value instanceof JSStringValue) {
      nameStr = nameProp.Value.stringValue();
    } else {
      nameStr = '<unknown>';
    }
  }
  if (nameStr) {
    base += `: ${nameStr}`;
  } else {
    base += ' (anonymous)';
  }
  base += ']';

  if (constructor && constructor !== type) {
    base += ` ${constructor}`;
  }

  if (tag !== '' && tag !== constructor) {
    base += ` [${tag}]`;
  }

  return base;
}

interface InspectContext {
  realm: Realm;
  indent: number;
  inspected: Value[];
  compact: boolean;

  readonly showNonEnumerable: boolean;
  readonly showProxy: boolean;
  stylize: Stylizer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inspector = (value: any, context: InspectContext, inner: (v: Value) => string) => string;

const INSPECTORS = Object.freeze({
  // @ts-expect-error https://github.com/microsoft/TypeScript/issues/38385
  __proto__: null,
  Null: (_: NullValue, ctx) => ctx.stylize('null', 'null'),
  Undefined: (_: UndefinedValue, ctx) => ctx.stylize('undefined', 'undefined'),
  Boolean: (v: BooleanValue, ctx) => ctx.stylize(v.booleanValue().toString(), 'boolean'),
  Number: (v: NumberValue, ctx) => {
    const n = R(v);
    if (n === 0 && Object.is(n, -0)) {
      return ctx.stylize('-0', 'number');
    }
    return ctx.stylize(n.toString(), 'number');
  },
  BigInt: (v: BigIntValue, ctx) => ctx.stylize(`${R(v)}n`, 'bigint'),
  String: (v: JSStringValue, ctx) => ctx.stylize(strEscape(v.stringValue()), 'string'),
  Symbol: (v: SymbolValue, ctx) => ctx.stylize(
    `Symbol(${v.Description instanceof UndefinedValue ? '' : v.Description.stringValue()})`,
    'symbol',
  ),
  Object: (v: ObjectValue, ctx, i) => {
    if (ctx.inspected.includes(v)) {
      return ctx.stylize('[Circular]', 'special');
    }

    if (isProxyExoticObject(v)) {
      if (!ctx.showProxy) {
        return 'Call' in v ? '[Function: <unknown>]' : '[object Unknown]';
      } else if (v.ProxyTarget === Value.null) {
        return 'Proxy { <revoked> }';
      } else {
        ctx.indent += 1;
        ctx.inspected.push(v);

        try {
          return `Proxy {
${'  '.repeat(ctx.indent)}${ctx.stylize('[[ProxyTarget]]', 'internalSlot')}: ${i(v.ProxyTarget)},
${'  '.repeat(ctx.indent)}${ctx.stylize('[[ProxyHandler]]', 'internalSlot')}: ${i(v.ProxyHandler)},
${'  '.repeat(ctx.indent - 1)}}`;
        } finally {
          ctx.inspected.pop();
          ctx.indent -= 1;
        }
      }
    }

    const constructor = getConstructorName(v);
    let tag = '';
    try {
      const maybeTag = X(getNoSideEffects(v, wellKnownSymbols.toStringTag));
      if (maybeTag instanceof JSStringValue) {
        tag = maybeTag.stringValue();
      }
    } catch {}

    let base = '';
    let braces: readonly [open: string, close: string] = OBJECT_BRACES;
    let keys = getKeys(v, ctx.showNonEnumerable);

    const slots: Array<readonly [name: string, value: string]> = [];
    const cache: Array<readonly [key: string, value: string]> = [];

    if (IsCallable(v)) {
      base = ctx.stylize(getFunctionBase(v as FunctionObject, constructor, tag), 'special');
      if (keys.length === 0) {
        return base;
      }
    } else if (isPromiseObject(v)) {
      ctx.indent += 1;
      const result = v.PromiseState === 'pending' ? ctx.stylize('undefined', 'undefined') : i(v.PromiseResult!);
      ctx.indent -= 1;

      base = getPrefix(constructor, tag, 'Promise');
      slots.push(
        ['[[PromiseState]]', ctx.stylize(v.PromiseState, 'special')],
        ['[[PromiseResult]]', result],
      );
    } else if (IsError(v)) {
      return v.ErrorData.stringValue();
    } else if (isRegExpObject(v)) {
      const P = EscapeRegExpPattern(v.OriginalSource, v.OriginalFlags).stringValue();
      const F = v.OriginalFlags.stringValue();
      base = `/${P}/${F}`;

      const prefix = getPrefix(constructor, tag, 'RegExp');
      if (prefix !== 'RegExp ') {
        base = `${prefix}${base}`;
      }

      base = ctx.stylize(base, 'regexp');

      if (keys.length === 0) {
        return base;
      }
    } else if (isDateObject(v)) {
      const d = new Date(R(v.DateValue));
      const str = Number.isNaN(d.getTime()) ? 'Invalid' : d.toISOString();
      base = getBoxedBase('Date', str, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if (isBooleanObject(v)) {
      base = getBoxedBase('Boolean', v.BooleanData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('NumberData' in v) {
      base = getBoxedBase('Number', (v as NumberObject).NumberData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if (isBigIntObject(v)) {
      base = getBoxedBase('BigInt', v.BigIntData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('StringData' in v) {
      base = getBoxedBase('String', (v as StringObject).StringData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('SymbolData' in v) {
      base = getBoxedBase('Symbol', (v as SymbolObject).SymbolData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('ParameterMap' in v) {
      base = ctx.stylize('[Arguments]', 'special');
      if (keys.length === 0) {
        return `${base} { }`;
      }
    }

    let prefix = '';
    if (base) {
      prefix = `${base} `;
    } else if (tag !== '' || constructor !== 'Object') {
      prefix = getPrefix(constructor, tag, 'Object');
    }

    ctx.indent += 1;
    ctx.inspected.push(v);

    try {
      const isArray = isArrayExoticObject(v);
      const isTypedArray = isTypedArrayObject(v);

      const outArray = [];
      if (isArray || isTypedArray) {
        const length = X(LengthOfArrayLike(v));

        if (isTypedArray) {
          prefix = getPrefix(constructor, tag, v.TypedArrayName.stringValue(), `(${length})`);
        } else {
          prefix = (constructor !== 'Array' || tag !== '')
            ? getPrefix(constructor, tag, 'Array', `(${length})`)
            : '';
        }

        braces = ARRAY_BRACES;
        keys = keys.filter((k) => !isArrayIndex(k));

        let holes = 0;
        const flushHoles = () => {
          if (holes > 0) {
            outArray.push(`<${holes} empty items>`);
            holes = 0;
          }
        };
        for (let j = 0; j < length; j += 1) {
          const elem = X(v.GetOwnProperty(Value(j.toString())));
          if (elem instanceof UndefinedValue) {
            holes += 1;
          } else {
            flushHoles();
            outArray.push(formatProperty(elem, ctx, i));
          }
        }
        flushHoles();
      }

      for (const key of keys) {
        const C = X(v.GetOwnProperty(key)) as Descriptor;
        const k = key instanceof JSStringValue && bareKeyRe.test(key.stringValue())
          ? ctx.stylize(key.stringValue(), 'name')
          : i(key);
        cache.push([
          C.Enumerable === Value.true ? k : `${ctx.stylize(`[${k}`, 'hidden')}${ctx.stylize(']', 'hidden')}`,
          formatProperty(C, ctx, i),
        ]);
      }

      let outStr = `${prefix}${braces[0]}`;
      if (slots.length > 0 || (cache.length + outArray.length) > 5) {
        slots.forEach((s) => {
          outStr += `\n${'  '.repeat(ctx.indent)}${ctx.stylize(s[0], 'internalSlot')}: ${s[1]},`;
        });
        outArray.forEach((c) => {
          outStr += `\n${'  '.repeat(ctx.indent)}${c},`;
        });
        cache.forEach((c) => {
          outStr += `\n${'  '.repeat(ctx.indent)}${c[0]}: ${c[1]},`;
        });
        outStr += `\n${'  '.repeat(ctx.indent - 1)}${braces[1]}`;
      } else {
        const oc = ctx.compact;
        ctx.compact = true;
        outArray.forEach((c, index) => {
          outStr += `${(index === 0) ? '' : ','} ${c}`;
        });
        cache.forEach((c, index) => {
          outStr += `${(index === 0 && outArray.length === 0) ? '' : ','} ${c[0]}: ${c[1]}`;
        });
        ctx.compact = oc;
        outStr += ` ${braces[1]}`;
      }
      return outStr;
    } catch {
      return base || '[object Unknown]';
    } finally {
      ctx.indent -= 1;
      ctx.inspected.pop();
    }
  },
} satisfies Record<Value['type'], Inspector>);

export interface InspectOptions {
  readonly showNonEnumerable?: boolean | null;
  readonly showProxy?: boolean | null;
}

export function inspect(value: Value | ValueCompletion, options: InspectOptions = {}): string {
  const context: InspectContext = {
    realm: surroundingAgent.currentRealmRecord,
    indent: 0,
    inspected: [],
    compact: false,

    showNonEnumerable: !!options.showNonEnumerable,
    showProxy: options.showProxy !== false,
    stylize: stylizeNoColor,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inner = (v: Value) => (INSPECTORS[v.type] as any)(v, context, inner);
  if (value instanceof Completion) {
    value = value.Value;
  }
  return inner(value);
}
