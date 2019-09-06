import { surroundingAgent } from './engine.mjs';
import { Type, Value, wellKnownSymbols } from './value.mjs';
import { Realm as APIRealm } from './api.mjs';
import {
  Call, IsArray, Get, LengthOfArrayLike,
} from './abstract-ops/all.mjs';
import { X } from './completion.mjs';

const getObjectTag = (value, wrap) => {
  try {
    const s = X(Get(value, wellKnownSymbols.toStringTag)).stringValue();
    if (wrap) {
      return `[${s}] `;
    }
    return s;
  } catch {
    return '';
  }
};

const compactObject = (realm, value) => {
  try {
    const toString = X(Get(value, new Value('toString')));
    const objectToString = realm.Intrinsics['%Object.prototype.toString%'];
    if (toString.nativeFunction === objectToString.nativeFunction) {
      return X(Call(toString, value)).stringValue();
    } else {
      const tag = getObjectTag(value, false) || 'Unknown';
      const ctor = X(Get(value, new Value('constructor')));
      if (Type(ctor) === 'Object') {
        const ctorName = X(Get(ctor, new Value('name'))).stringValue();
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

const INSPECTORS = {
  Completion: (v, ctx, i) => i(v.Value),
  Null: () => 'null',
  Undefined: () => 'undefined',
  Boolean: (v) => v.value.toString(),
  Number: (v) => {
    const n = v.numberValue();
    if (n === 0 && Object.is(n, -0)) {
      return '-0';
    }
    return n.toString();
  },
  String: (v, ctx) => (ctx.quote ? `'${v.stringValue().replace(/\n/g, '\\n')}'` : v.stringValue()),
  Symbol: (v) => `Symbol(${v.Description === Value.undefined ? '' : v.Description.stringValue()})`,
  Object: (v, ctx, i) => {
    if (ctx.inspected.includes(v)) {
      return '[Circular]';
    }
    if ('PromiseState' in v) {
      ctx.indent += 1;
      const result = v.PromiseState === 'pending' ? 'undefined' : i(v.Value);
      ctx.indent -= 1;
      return `Promise {
  [[PromiseState]]: ${v.PromiseState}
  [[PromiseResult]]: ${result}
}`;
    }

    if ('Call' in v) {
      const name = v.properties.get(new Value('name'));
      if (name !== undefined) {
        return `[Function: ${name.Value.stringValue()}]`;
      }
      return '[Function]';
    }

    if ('BooleanData' in v) {
      return `[Boolean ${i(v.BooleanData)}]`;
    }
    if ('NumberData' in v) {
      return `[Number ${i(v.NumberData)}]`;
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
      const tag = getObjectTag(v);
      const isArray = IsArray(v) === Value.true;
      const isTypedArray = 'TypedArrayName' in v;
      if (isArray || isTypedArray) {
        const length = X(LengthOfArrayLike(v)).numberValue();
        let holes = 0;
        const out = [];
        for (let j = 0; j < length; j += 1) {
          const elem = X(v.GetOwnProperty(new Value(j.toString())));
          if (elem === Value.undefined) {
            holes += 1;
          } else {
            if (holes > 0) {
              out.push(`<${holes} empty items>`);
              holes = 0;
            }
            if (elem.Value) {
              out.push(i(elem.Value));
            } else {
              out.push('[Getter]');
            }
          }
        }
        return `${isTypedArray ? `${v.TypedArrayName.stringValue()} ` : ''}[${out.join(', ')}]`;
      }

      const keys = X(v.OwnPropertyKeys());
      const cache = [];
      for (const key of keys) {
        const C = X(v.GetOwnProperty(key));
        if (C.Enumerable === Value.true) {
          cache.push([i(key), i(C.Value)]);
        }
      }

      let out = `${tag} {`;
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

export function inspect(value, realm = surroundingAgent.currentRealmRecord) {
  if (realm instanceof APIRealm) {
    realm = realm.realm;
  }
  const context = {
    realm,
    indent: 0,
    quote: true,
    inspected: [],
  };
  const inner = (v) => INSPECTORS[Type(v)](v, context, inner);
  return inner(value);
}
