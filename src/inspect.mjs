import { surroundingAgent } from './engine.mjs';
import { Type, Value, wellKnownSymbols } from './value.mjs';
import {
  Assert,
  Call,
  EscapeRegExpPattern,
  Get,
  HasOwnProperty,
  IsAccessorDescriptor,
  IsArray,
  IsCallable,
  IsDataDescriptor,
  LengthOfArrayLike,
  isArrayIndex,
  isECMAScriptFunctionObject,
} from './abstract-ops/all.mjs';
import { Q, X } from './completion.mjs';
import { OutOfRange } from './helpers.mjs';

const bareKeyRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

const styles = {
  bigint: 'blueBright',
  boolean: 'yellow',
  date: 'magenta',
  hidden: 'blackBright',
  internalSlot: 'blackBright',
  module: 'underline',
  name: undefined,
  null: 'bold',
  number: 'blueBright',
  regexp: 'red',
  special: 'cyan',
  string: 'green',
  symbol: 'green',
  undefined: 'blackBright',
};
Object.setPrototypeOf(styles, null);

const resetFG = 39;
const resetBG = 49;

const colors = {
  reset: [0, 0],
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],

  black: [30, resetFG],
  red: [31, resetFG],
  green: [32, resetFG],
  yellow: [33, resetFG],
  blue: [34, resetFG],
  magenta: [35, resetFG],
  cyan: [36, resetFG],
  white: [37, resetFG],

  blackBright: [90, resetFG],
  redBright: [91, resetFG],
  greenBright: [92, resetFG],
  yellowBright: [93, resetFG],
  blueBright: [94, resetFG],
  magentaBright: [95, resetFG],
  cyanBright: [96, resetFG],
  whiteBright: [97, resetFG],

  bgBlack: [40, resetBG],
  bgRed: [41, resetBG],
  bgGreen: [42, resetBG],
  bgYellow: [43, resetBG],
  bgBlue: [44, resetBG],
  bgMagenta: [45, resetBG],
  bgCyan: [46, resetBG],
  bgWhite: [47, resetBG],

  bgBlackBright: [100, resetBG],
  bgRedBright: [101, resetBG],
  bgGreenBright: [102, resetBG],
  bgYellowBright: [103, resetBG],
  bgBlueBright: [104, resetBG],
  bgMagentaBright: [105, resetBG],
  bgCyanBright: [106, resetBG],
  bgWhiteBright: [107, resetBG],
};
Object.setPrototypeOf(colors, null);

const stylizeWithColor = (text, styleName) => {
  const style = styles[styleName];
  if (style !== undefined) {
    const color = colors[style];
    if (color !== undefined) {
      return `\x1b[${color[0]}m${text}\x1b[${color[1]}m`;
    }
  }
  return text;
};

const stylizeNoColor = (text) => text;

const getFunctionType = (func) => {
  Assert(IsCallable(func) === Value.true);

  if (!isECMAScriptFunctionObject(func)) {
    return 'Function';
  }

  switch (func.ECMAScriptCode.type) {
    case 'AsyncFunctionBody':
    case 'AsyncConciseBody':
      return 'AsyncFunction';
    case 'AsyncGeneratorBody':
      return 'AsyncGeneratorFunction';
    case 'GeneratorBody':
      return 'GeneratorFunction';
    default:
      return 'Function';
  }
};

const getDefaultConstructorName = (v) => {
  Assert(Type(v) === 'Object');

  if ('Call' in v) {
    return getFunctionType(v);
  }

  if ('TypedArrayName' in v) {
    return v.TypedArrayName.stringValue();
  }

  if (IsArray(v)) {
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
};

const getConstructorName = (value) => {
  let firstProto;
  let obj = value;
  while (Type(obj) === 'Object') {
    const desc = obj.GetOwnProperty(new Value('constructor'));
    if (IsDataDescriptor(desc) && IsCallable(desc.Value) === Value.true) {
      try {
        return X(Get(desc.Value, new Value('name'))).stringValue();
      } catch {}
    }

    obj = obj.GetPrototypeOf();
    if (!firstProto) {
      firstProto = obj;
    }
  }

  if (firstProto === Value.null) {
    return null;
  }

  const fallback = getDefaultConstructorName(value);

  return `${fallback} <Complex prototype>`;
};

const getPrefix = (constructor, tag, type, size = '') => {
  let prefix;
  if (constructor === null) {
    prefix = `[${type}${size}: null prototype] `;
  } else if (type !== 'Object') {
    prefix = `${type}${size} `;
    if (constructor !== type) {
      prefix += `(${constructor}) `;
    }
  } else {
    prefix = `${constructor}${size} `;
  }

  if (tag !== '' && tag !== constructor && tag !== type) {
    prefix += `[${tag}] `;
  }

  return prefix;
};

const getBoxedBase = (type, value, ctx, innerInspect, constructor, tag) => {
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
  base += `: ${typeof value === 'string' ? value : innerInspect(value)}]`;
  ctx.stylize = os;

  if (tag !== '' && tag !== constructor && tag !== type) {
    base += ` [${tag}]`;
  }

  return ctx.stylize(base, type.toLowerCase());
};

const getFunctionBase = (value, constructor, tag) => {
  Assert(IsCallable(value) === Value.true);

  if (value.IsClassConstructor === Value.true) {
    let name;
    try {
      name = X(value.GetOwnProperty(new Value('name'))) !== Value.undefined
        && X(Get(value, new Value('name'))).stringValue();
    } catch {}

    let base = `class ${name || '(anonymous)'}`;
    if (constructor !== 'Function' && constructor !== null) {
      base += ` [${constructor}]`;
    }
    if (tag !== '' && tag !== constructor) {
      base += ` [${tag}]`;
    }

    if (constructor === null) {
      base += ' extends [null prototype]';
    } else {
      let superObj;
      try {
        superObj = X(value.GetPrototypeOf());
      } catch {}
      if (superObj.nativeFunction !== surroundingAgent.intrinsic('%Function.prototype%').nativeFunction) {
        let superName;
        try {
          superObj = X(value.GetPrototypeOf());
          superName = X(Get(superObj, new Value('name'))).stringValue();
        } catch {}
        base += ` extends ${superName || '(anonymous)'}`;
      }
    }

    return `[${base}]`;
  }

  const type = getFunctionType(value);
  let base = `[${type}`;
  if (constructor === null) {
    base += ' (null prototype)';
  }

  try {
    const name = X(Get(value, new Value('name'))).stringValue();
    if (name) {
      base += `: ${name}`;
    } else {
      base += ' (anonymous)';
    }
  } catch {
    base += ': <unknown>';
  }
  base += ']';

  if (constructor !== type && constructor !== null) {
    base += ` ${constructor}`;
  }

  if (tag !== '' && tag !== constructor) {
    base += ` [${tag}]`;
  }

  return base;
};

// Based on `EnumerableOwnPropertyNames`, but returns Symbol properties as well:
const getKeys = (O, includeNonEnumerable = false) => {
  Assert(Type(O) === 'Object');

  const ownKeys = X(O.OwnPropertyKeys());
  if (includeNonEnumerable) {
    return ownKeys;
  }

  const properties = [];
  for (const key of ownKeys) {
    const desc = Q(O.GetOwnProperty(key));
    if (desc !== Value.undefined && desc.Enumerable === Value.true) {
      properties.push(key);
    }
  }

  return properties;
};

const formatPropertyDescriptor = (desc, ctx, i) => {
  Assert(Type(desc) === 'Descriptor');
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
};

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
const escapeFn = (str) => strEscapeArray[str.charCodeAt(0)];

// Roughly based on the JSON stringify escaping.
const strEscape = (str) => {
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
};

const compactObject = (value) => {
  try {
    const toString = X(Get(value, new Value('toString')));
    const objectToString = surroundingAgent.intrinsic('%Object.prototype.toString%');
    if (toString.nativeFunction === objectToString.nativeFunction) {
      return X(Call(toString, value)).stringValue();
    } else {
      return '<#Object>';
    }
  } catch {
    return '<#Object>';
  }
};

const INSPECTORS = {
  Completion: (v, ctx, i) => i(v.Value),
  Null: (v, ctx) => ctx.stylize('null', 'null'),
  Undefined: (v, ctx) => ctx.stylize('undefined', 'undefined'),
  Boolean: (v, ctx) => ctx.stylize(v.booleanValue().toString(), 'boolean'),
  Number: (v, ctx) => {
    const n = v.numberValue();
    if (n === 0 && Object.is(n, -0)) {
      return ctx.stylize('-0', 'number');
    }
    return ctx.stylize(n.toString(), 'number');
  },
  BigInt: (v, ctx) => ctx.stylize(`${v.bigintValue()}n`, 'bigint'),
  String: (v, ctx) => ctx.stylize(strEscape(v.stringValue()), 'string'),
  Symbol: (v, ctx) => ctx.stylize(
    `Symbol(${v.Description === Value.undefined ? '' : v.Description.stringValue()})`,
    'symbol',
  ),
  Object: (v, ctx, i) => {
    if (ctx.inspected.includes(v)) {
      return ctx.stylize('[Circular]', 'special');
    }

    if (ctx.showProxy && 'ProxyTarget' in v) {
      if (v.ProxyTarget === Value.null) {
        return 'Proxy { <revoked> }';
      } else {
        return `Proxy {
  ${ctx.stylize('[[ProxyTarget]]', 'internalSlot')}: ${i(v.ProxyTarget)},
  ${ctx.stylize('[[ProxyHandler]]', 'internalSlot')}: ${i(v.ProxyHandler)},
}`;
      }
    }

    const constructor = getConstructorName(v);
    let tag = '';
    try {
      tag = X(Get(v, wellKnownSymbols.toStringTag)).stringValue();
    } catch {}
    if (tag) {
      // Only print the %Symbol.toStringTag% value in the header
      // if it's not an own property or is non-enumerable,
      // otherwise we'd print it twice.
      try {
        if (ctx.showHidden) {
          if (X(HasOwnProperty(v, wellKnownSymbols.toStringTag)) === Value.true) {
            tag = '';
          }
        } else {
          const desc = X(v.GetOwnProperty(wellKnownSymbols.toStringTag));
          if (desc !== Value.undefined && desc.Enumerable === Value.true) {
            tag = '';
          }
        }
      } catch {
        tag = '';
      }
    }

    let base = '';
    let braces = ['{', '}'];
    let keys = getKeys(v, ctx.showHidden);

    const slots = [];

    if ('ErrorData' in v) {
      // TODO: Get this from the [[ErrorData]] internal slot:
      let e = Q(Get(v, new Value('stack')));
      if (!e.stringValue) {
        const toString = Q(Get(v, new Value('toString')));
        e = X(Call(toString, v));
      }
      return e.stringValue();
    }

    if ('Call' in v) {
      base = ctx.stylize(getFunctionBase(v, constructor, tag), 'special');
      if (keys.length === 0) {
        return base;
      }
    } else if ('PromiseState' in v) {
      ctx.indent += 1;
      const result = v.PromiseState === 'pending'
        ? ctx.stylize('undefined', 'undefined')
        : i(v.PromiseResult);
      ctx.indent -= 1;
      base = getPrefix(constructor, tag, 'Promise');

      if (keys.length === 0) {
        return `${base}{
  ${ctx.stylize('[[PromiseState]]', 'internalSlot')}: ${ctx.stylize(v.PromiseState, 'special')},
  ${ctx.stylize('[[PromiseResult]]', 'internalSlot')}: ${result},
}`;
      }

      slots.push(
        ['[[PromiseState]]', ctx.stylize(v.PromiseState, 'special')],
        ['[[PromiseResult]]', result],
      );
    } else if ('RegExpMatcher' in v) {
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
    } else if ('DateValue' in v) {
      const d = new Date(v.DateValue.numberValue());
      const str = Number.isNaN(d.getTime()) ? 'Invalid' : d.toISOString();
      base = getBoxedBase('Date', str, ctx, i, constructor, tag);

      if (keys.length === 0) {
        return base;
      }
    } else if ('BooleanData' in v) {
      base = getBoxedBase('Boolean', v.BooleanData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('NumberData' in v) {
      base = getBoxedBase('Number', v.NumberData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('BigIntData' in v) {
      base = getBoxedBase('BigInt', v.BigIntData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('StringData' in v) {
      base = getBoxedBase('String', v.StringData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if ('SymbolData' in v) {
      base = getBoxedBase('Symbol', v.SymbolData, ctx, i, constructor, tag);
      if (keys.length === 0) {
        return base;
      }
    } else if (constructor === 'Object') {
      if ('ParameterMap' in v) {
        braces[0] = '[Arguments] {';
      } else if (tag !== '') {
        braces[0] = `${getPrefix(constructor, tag, 'Object')}{`;
      }

      if (keys.length === 0) {
        return `${braces[0]}}`;
      }
    }

    ctx.indent += 1;
    ctx.inspected.push(v);

    try {
      const isArray = IsArray(v) === Value.true;
      const isTypedArray = 'TypedArrayName' in v;

      const outArray = [];
      if (isArray || isTypedArray) {
        const length = X(LengthOfArrayLike(v)).numberValue();

        let prefix;
        if (isArray) {
          prefix = (constructor !== 'Array' || tag !== '')
            ? getPrefix(constructor, tag, 'Array', `(${length})`)
            : '';
        } else {
          Assert(isTypedArray === true);
          prefix = getPrefix(
            constructor,
            tag,
            v.TypedArrayName.stringValue(),
            `(${length})`,
          );
        }

        braces = [`${prefix}[`, ']'];
        keys = keys.filter((k) => !isArrayIndex(k));

        let holes = 0;
        // FIXME: This is very slow for big arrays with holes
        for (let j = 0; j < length; j += 1) {
          const elem = X(v.GetOwnProperty(new Value(j.toString())));
          if (elem === Value.undefined) {
            Assert(isTypedArray === false);
            holes += 1;
          } else {
            if (holes > 0) {
              outArray.push(`<${holes} empty items>`);
              holes = 0;
            }
            outArray.push(formatPropertyDescriptor(elem, ctx, i));
          }
        }
        if (holes > 0) {
          outArray.push(`<${holes} empty items>`);
          holes = 0;
        }
      }

      const cache = [];
      for (const key of keys) {
        const C = X(v.GetOwnProperty(key));
        const k = Type(key) === 'String' && bareKeyRe.test(key.stringValue())
          ? ctx.stylize(key.stringValue(), 'name')
          : i(key);
        cache.push([
          C.Enumerable === Value.true
            ? k
            : `${ctx.stylize(`[${k}`, 'hidden')}${ctx.stylize(']', 'hidden')}`,
          formatPropertyDescriptor(C, ctx, i),
        ]);
      }

      let outStr = `${base ? `${base} ` : ''}${braces[0]}`;
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
          outStr = `${outStr}${(index === 0) ? '' : ','} ${c}`;
        });
        cache.forEach((c, index) => {
          outStr = `${outStr}${(index === 0 && outArray.length === 0) ? '' : ','} ${c[0]}: ${c[1]}`;
        });
        ctx.compact = oc;
        outStr += ` ${braces[1]}`;
      }

      return outStr;
    } catch {
      return compactObject(v);
    } finally {
      ctx.indent -= 1;
      ctx.inspected.pop();
    }
  },
};

export function inspect(value, options = {}) {
  const context = {
    realm: surroundingAgent.currentRealmRecord,
    indent: 0,
    inspected: [],
    stylize: options.colors ? stylizeWithColor : stylizeNoColor,
    showHidden: !!options.showHidden,
    showProxy: !!options.showProxy,
  };
  const inner = (v) => INSPECTORS[Type(v)](v, context, inner);
  return inner(value);
}
