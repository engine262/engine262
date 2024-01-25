// @ts-nocheck
import { surroundingAgent } from './engine.mjs';
import {
  Type, JSStringValue, ObjectValue, Value, wellKnownSymbols, BooleanValue, NumberValue, BigIntValue, SymbolValue, PrivateName, UndefinedValue,
} from './value.mjs';
import {
  Call, IsArray, Get, LengthOfArrayLike,
  EscapeRegExpPattern, R, Realm, type BuiltinFunctionObject,
} from './abstract-ops/all.mjs';
import { Completion, Q, X } from './completion.mjs';

const bareKeyRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

function getObjectTag(value: ObjectValue, wrap: boolean): string {
  let s = '';
  try {
    s = X(Get(value, wellKnownSymbols.toStringTag)).stringValue();
  } catch { }
  try {
    const c = X(Get(value, Value('constructor')));
    s = X(Get(c, Value('name'))).stringValue();
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
    const toString = X(Get(value, Value('toString')));
    const objectToString = realm.Intrinsics['%Object.prototype.toString%'] as BuiltinFunctionObject;
    if (toString.nativeFunction === objectToString.nativeFunction) {
      return X(Call(toString, value)).stringValue();
    } else {
      const tag = getObjectTag(value, false) || 'Unknown';
      const ctor = X(Get(value, Value('constructor')));
      if (ctor instanceof ObjectValue) {
        const ctorName = X(Get(ctor, Value('name'))).stringValue();
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
}

type Inspector = (value: unknown, context: InspectContext, inner: (v: Inspecable) => string) => string;

const INSPECTORS: Partial<Record<Types, Inspector>> = {
  Completion: (v: Completion<Inspecable>, ctx, i) => i(v.Value),
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
      const result = v.PromiseState === 'pending' ? 'undefined' : i(v.PromiseResult);
      ctx.indent -= 1;
      return `Promise {
  [[PromiseState]]: ${v.PromiseState}
  [[PromiseResult]]: ${result}
}`;
    }

    if ('Call' in v) {
      const name = v.properties.get(Value('name'));
      if (name !== undefined && name.Value.stringValue() !== '') {
        return `[Function: ${name.Value.stringValue()}]`;
      }
      return '[Function]';
    }

    if ('ErrorData' in v) {
      let e = Q(Get(v, Value('stack')));
      if (!e.stringValue) {
        const toString = Q(Get(v, Value('toString')));
        e = X(Call(toString, v));
      }
      return e.stringValue();
    }

    if ('RegExpMatcher' in v) {
      const P = EscapeRegExpPattern(v.OriginalSource, v.OriginalFlags).stringValue();
      const F = v.OriginalFlags.stringValue();
      return `/${P}/${F}`;
    }

    if ('DateValue' in v) {
      const d = new Date(R(v.DateValue));
      if (Number.isNaN(d.getTime())) {
        return '[Date Invalid]';
      }
      return `[Date ${d.toISOString()}]`;
    }

    if ('BooleanData' in v) {
      return `[Boolean ${i(v.BooleanData)}]`;
    }
    if ('NumberData' in v) {
      return `[Number ${i(v.NumberData)}]`;
    }
    if ('BigIntData' in v) {
      return `[BigInt ${i(v.BigIntData)}]`;
    }
    if ('StringData' in v) {
      return `[String ${i(v.StringData)}]`;
    }
    if ('SymbolData' in v) {
      return `[Symbol ${i(v.SymbolData)}]`;
    }

    ctx.indent += 1;
    ctx.inspected.push(v);

    try {
      const isArray = IsArray(v) === Value.true;
      const isTypedArray = 'TypedArrayName' in v;
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
          if (elem === Value.undefined) {
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
        const C = X(v.GetOwnProperty(key));
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
      return compactObject(ctx, v);
    } finally {
      ctx.indent -= 1;
      ctx.inspected.pop();
    }
  },
};

export function inspect(value: Value) {
  const context: InspectContext = {
    realm: surroundingAgent.currentRealmRecord,
    indent: 0,
    inspected: [],
  };
  const inner = (v: Inspecable) => INSPECTORS[Type(v)]!(v, context, inner);
  return inner(value);
}
