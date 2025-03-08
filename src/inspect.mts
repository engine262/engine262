import { surroundingAgent } from './engine.mts';
import {
  Type, JSStringValue, ObjectValue, Value, wellKnownSymbols, BooleanValue, NumberValue, BigIntValue, SymbolValue, PrivateName, UndefinedValue,
} from './value.mts';
import {
  Call, IsArray, Get, LengthOfArrayLike,
  EscapeRegExpPattern, R, Realm, type BuiltinFunctionObject,
} from './abstract-ops/all.mts';
import { Completion, X } from './completion.mts';
import { isRegExpObject } from './intrinsics/RegExp.mts';
import type { DateObject } from './intrinsics/Date.mts';
import type { BooleanObject } from './intrinsics/Boolean.mts';
import type { NumberObject } from './intrinsics/Number.mts';
import type { BigIntObject } from './intrinsics/BigInt.mts';
import type { StringObject } from './intrinsics/String.mts';
import type { SymbolObject } from './intrinsics/Symbol.mts';
import { isTypedArrayObject } from './intrinsics/TypedArray.mts';
import type { Descriptor, PromiseObject } from '#self';

const bareKeyRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

function getObjectTag(value: ObjectValue, wrap = false): string {
  let s = '';
  try {
    s = X((Get(value, wellKnownSymbols.toStringTag) as JSStringValue)).stringValue();
  } catch { }
  try {
    const c = X(Get(value, Value('constructor')));
    s = (X(Get(c as ObjectValue, Value('name'))) as JSStringValue).stringValue();
  } catch { }
  if (s) {
    if (wrap) {
      return `[${s}] `;
    }
    return s;
  }
  return '';
}

const compactObject = (realm: Realm, value: ObjectValue) => {
  try {
    const toString = X(Get(value, Value('toString'))) as BuiltinFunctionObject;
    const objectToString = realm.Intrinsics['%Object.prototype.toString%'] as BuiltinFunctionObject;
    if (toString.nativeFunction === objectToString.nativeFunction) {
      return (X(Call(toString, value)) as JSStringValue).stringValue();
    } else {
      const tag = getObjectTag(value, false) || 'Unknown';
      const ctor = X(Get(value, Value('constructor')));
      if (ctor instanceof ObjectValue) {
        const ctorName = (X(Get(ctor, Value('name'))) as JSStringValue).stringValue();
        if (ctorName !== '') {
          return `#<${ctorName}>`;
        }
        return `[object ${tag}]`;
      }
      return `[object ${tag}]`;
    }
  } catch (e) {
    return '[object Unknown]';
  }
};

type Inspecable = Parameters<typeof Type>[0];

type Types = ReturnType<typeof Type>;

interface InspectContext {
  realm: Realm;
  indent: number;
  inspected: Inspecable[];
  compact: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Inspector = (value: any, context: InspectContext, inner: (v: Inspecable) => string) => string;

const INSPECTORS: Partial<Record<Types, Inspector>> = {
  Completion: (v: Completion<Inspecable>, _ctx, i) => i(v.Value || Value.undefined),
  Null: () => 'null',
  Undefined: () => 'undefined',
  Boolean: (v: BooleanValue) => v.booleanValue().toString(),
  Number: (v: NumberValue) => {
    const n = R(v);
    if (n === 0 && Object.is(n, -0)) {
      return '-0';
    }
    return n.toString();
  },
  BigInt: (v: BigIntValue) => `${R(v)}n`,
  String: (v: JSStringValue) => {
    const s = JSON.stringify(v.stringValue()).slice(1, -1);
    return `'${s}'`;
  },
  Symbol: (v: SymbolValue) => `Symbol(${v.Description instanceof UndefinedValue ? '' : v.Description.stringValue()})`,
  PrivateName: (v: PrivateName) => v.Description.stringValue(),
  Object: (v: ObjectValue, ctx, i) => {
    if (ctx.inspected.includes(v)) {
      return '[Circular]';
    }
    if ('PromiseState' in v) {
      ctx.indent += 1;
      const result = v.PromiseState === 'pending' ? 'undefined' : i((v as PromiseObject).PromiseResult!);
      ctx.indent -= 1;
      return `Promise {
  [[PromiseState]]: ${v.PromiseState}
  [[PromiseResult]]: ${result}
}`;
    }

    if ('Call' in v) {
      const name = v.properties.get('name');
      if (name && (name.Value! as JSStringValue).stringValue() !== '') {
        return `[Function: ${(name.Value as JSStringValue).stringValue()}]`;
      }
      return '[Function]';
    }

    if ('ErrorData' in v) {
      let e = X(Get(v, Value('stack')));
      if (!(e as JSStringValue).stringValue) {
        const toString = X(Get(v, Value('toString')));
        e = X(Call(toString, v));
      }
      return (e as JSStringValue).stringValue();
    }

    if (isRegExpObject(v)) {
      const P = EscapeRegExpPattern(v.OriginalSource, v.OriginalFlags).stringValue();
      const F = v.OriginalFlags.stringValue();
      return `/${P}/${F}`;
    }

    if ('DateValue' in v) {
      const d = new Date(R((v as DateObject).DateValue));
      if (Number.isNaN(d.getTime())) {
        return '[Date Invalid]';
      }
      return `[Date ${d.toISOString()}]`;
    }

    if ('BooleanData' in v) {
      return `[Boolean ${i((v as BooleanObject).BooleanData)}]`;
    }
    if ('NumberData' in v) {
      return `[Number ${i((v as NumberObject).NumberData)}]`;
    }
    if ('BigIntData' in v) {
      return `[BigInt ${i((v as BigIntObject).BigIntData)}]`;
    }
    if ('StringData' in v) {
      return `[String ${i((v as StringObject).StringData)}]`;
    }
    if ('SymbolData' in v) {
      return `[Symbol ${i((v as SymbolObject).SymbolData)}]`;
    }

    ctx.indent += 1;
    ctx.inspected.push(v);

    try {
      const isArray = IsArray(v) === Value.true;
      const isTypedArray = isTypedArrayObject(v);
      if (isArray || isTypedArray) {
        const length = X(LengthOfArrayLike(v));
        let holes = 0;
        const flushHoles = () => {
          if (holes > 0) {
            out.push(`<${holes} empty items>`);
            holes = 0;
          }
        };
        const out = [];
        for (let j = 0; j < length; j += 1) {
          const elem = X(v.GetOwnProperty(Value(j.toString())));
          if (elem instanceof UndefinedValue) {
            holes += 1;
          } else {
            flushHoles();
            if (elem.Value) {
              out.push(i(elem.Value));
            } else {
              out.push('<accessor>');
            }
          }
        }
        flushHoles();
        return `${isTypedArray ? `${v.TypedArrayName.stringValue()} ` : ''}[${out.join(', ')}]`;
      }

      const keys = X(v.OwnPropertyKeys());
      const cache = [];
      for (const key of keys) {
        const C = X(v.GetOwnProperty(key)) as Descriptor;
        if (C.Enumerable === Value.true) {
          cache.push([
            key instanceof JSStringValue && bareKeyRe.test(key.stringValue()) ? key.stringValue() : i(key),
            C.Value ? i(C.Value) : '<accessor>',
          ]);
        }
      }

      const tag = getObjectTag(v);
      let out = tag && tag !== 'Object' ? `${tag} {` : '{';
      if (cache.length > 5) {
        cache.forEach((c) => {
          out = `${out}\n${'  '.repeat(ctx.indent)}${c[0]}: ${c[1]},`;
        });
        return `${out}\n${'  '.repeat(ctx.indent - 1)}}`;
      } else {
        const oc = ctx.compact;
        ctx.compact = true;
        cache.forEach((c, index) => {
          out = `${out}${index === 0 ? '' : ','} ${c[0]}: ${c[1]}`;
        });
        ctx.compact = oc;
        return `${out} }`;
      }
    } catch {
      return compactObject(ctx.realm, v);
    } finally {
      ctx.indent -= 1;
      ctx.inspected.pop();
    }
  },
};

export function inspect(value: Value | Completion<unknown>) {
  const context: InspectContext = {
    realm: surroundingAgent.currentRealmRecord,
    indent: 0,
    inspected: [],
    compact: false,
  };
  const inner = (v: Inspecable) => INSPECTORS[Type(v)]!(v, context, inner);
  return inner(value);
}
