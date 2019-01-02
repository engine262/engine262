import { ScriptEvaluationJob, surroundingAgent } from '../engine.mjs';
import {
  BooleanValue,
  NullValue,
  NumberValue,
  ObjectValue,
  StringValue,
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  Call,
  CreateDataProperty,
  EnumerableOwnPropertyNames,
  Get,
  IsArray,
  IsCallable,
  ObjectCreate,
  ToInteger,
  ToLength,
  ToNumber,
  ToString,
} from '../abstract-ops/all.mjs';
import { EnsureCompletion, Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function JSON_parse([text, reviver]) {
  function InternalizeJSONProperty(holder, name) {
    const val = Q(Get(holder, name));
    if (Type(val) === 'Object') {
      const isArray = Q(IsArray(val));
      if (isArray === Value.true) {
        let I = 0;
        const lenProp = Q(Get(val, new Value('length')));
        const len = Q(ToLength(lenProp)).numberValue();
        while (I < len) {
          const Istr = X(ToString(new Value(I)));
          const newElement = Q(InternalizeJSONProperty(val, Istr));
          if (Type(newElement) === 'Undefined') {
            Q(val.Delete(Istr));
          } else {
            Q(CreateDataProperty(val, Istr, newElement));
          }
          I += 1;
        }
      } else {
        const keys = Q(EnumerableOwnPropertyNames(val, 'key'));
        for (const P of keys) {
          const newElement = Q(InternalizeJSONProperty(val, P));
          if (Type(newElement) === 'Undefined') {
            Q(val.Delete(P));
          } else {
            Q(CreateDataProperty(val, P, newElement));
          }
        }
      }
    }
    return Q(Call(reviver, holder, [name, val]));
  }

  const jText = Q(ToString(text));
  // Parse JText interpreted as UTF-16 encoded Unicode points (6.1.4) as a JSON text as specified in ECMA-404.
  // Throw a SyntaxError exception if JText is not a valid JSON text as defined in that specification.
  try {
    JSON.parse(jText.stringValue());
  } catch (e) {
    return surroundingAgent.Throw('SyntaxError');
  }
  const scriptText = `(${jText.stringValue()});`;
  const completion = EnsureCompletion(ScriptEvaluationJob(scriptText));
  const unfiltered = completion.Value;
  Assert(unfiltered instanceof StringValue
         || unfiltered instanceof NumberValue
         || unfiltered instanceof BooleanValue
         || unfiltered instanceof NullValue
         || unfiltered instanceof ObjectValue);
  if (IsCallable(reviver) === Value.true) {
    const root = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
    const rootName = new Value('');
    const status = CreateDataProperty(root, rootName, unfiltered);
    Assert(status === Value.true);
    return Q(InternalizeJSONProperty(root, rootName));
  } else {
    return unfiltered;
  }
}

const codeUnitTable = new Map([
  ['\u0008', '\\b'],
  ['\u0009', '\\t'],
  ['\u000A', '\\n'],
  ['\u000C', '\\f'],
  ['\u000D', '\\r'],
  ['\u0022', '\\"'],
  ['\u005C', '\\\\'],
]);

function JSON_stringify([value, replacer, space]) {
  // 24.5.2.1 #sec-serializejsonproperty
  function SerializeJSONProperty(key, holder) {
    let value = Q(Get(holder, key)); // eslint-disable-line no-shadow
    if (Type(value) === 'Object') {
      const toJSON = Q(Get(value, new Value('toJSON')));
      if (IsCallable(toJSON) === Value.true) {
        value = Q(Call(toJSON, value, [key]));
      }
    }
    if (ReplacerFunction !== Value.undefined) {
      value = Q(Call(ReplacerFunction, holder, [key, value]));
    }
    if (Type(value) === 'Object') {
      if ('NumberData' in value) {
        value = Q(ToNumber(value));
      } else if ('StringData' in value) {
        value = Q(ToString(value));
      } else if ('BooleanData' in value) {
        value = value.BooleanData;
      }
    }
    if (value === Value.null) {
      return new Value('null');
    }
    if (value === Value.true) {
      return new Value('true');
    }
    if (value === Value.false) {
      return new Value('false');
    }
    if (Type(value) === 'String') {
      return QuoteJSONString(value);
    }
    if (Type(value) === 'Number') {
      if (!value.isInfinity()) {
        return X(ToString(value));
      }
      return new Value('null');
    }
    if (Type(value) === 'Object' && IsCallable(value) === Value.false) {
      const isArray = Q(IsArray(value));
      if (isArray === Value.true) {
        return Q(SerializeJSONArray(value));
      }
      return Q(SerializeJSONObject(value));
    }
    return Value.undefined;
  }

  function QuoteJSONString(value) { // eslint-disable-line no-shadow
    let product = '\u0022';
    for (const C of value.stringValue()) {
      if (codeUnitTable.has(C)) {
        product = `${product}${codeUnitTable.get(C)}`;
      } else if (C.charCodeAt(0) < 0x0020) {
        product = `${product}${UnicodeEscape(C)}`;
      } else {
        product = `${product}${C}`;
      }
    }
    product = `${product}\u0022`;
    return new Value(product);
  }

  function UnicodeEscape(C) {
    const n = C.charCodeAt(0);
    Assert(n < 0xFFFF);
    return `\u005Cu${n.toString(16).padStart(4, '0')}`;
  }

  // 24.5.2.4 #sec-serializejsonobject
  function SerializeJSONObject(value) { // eslint-disable-line no-shadow
    if (stack.includes(value)) {
      return surroundingAgent.Throw('TypeError', 'Cannot stringify a circular structure');
    }
    stack.push(value);
    const stepback = indent;
    indent = `${indent}${gap}`;
    let K;
    if (PropertyList !== Value.undefined) {
      K = PropertyList;
    } else {
      K = Q(EnumerableOwnPropertyNames(value, 'key'));
    }
    const partial = [];
    for (const P of K) {
      const strP = Q(SerializeJSONProperty(P, value));
      if (strP !== Value.undefined) {
        let member = QuoteJSONString(P).stringValue();
        member = `${member}:`;
        if (gap !== '') {
          member = `${member} `;
        }
        member = `${member}${strP.stringValue()}`;
        partial.push(member);
      }
    }
    let final;
    if (partial.length === 0) {
      final = new Value('{}');
    } else {
      if (gap === '') {
        const properties = partial.join(',');
        final = new Value(`{${properties}}`);
      } else {
        const separator = `,\u000A${indent}`;
        const properties = partial.join(separator);
        final = new Value(`{\u000A${indent}${properties}\u000A${stepback}}`);
      }
    }
    stack.pop();
    indent = stepback;
    return final;
  }

  // 24.5.2.5 #sec-serializejsonarray
  function SerializeJSONArray(value) { // eslint-disable-line no-shadow
    if (stack.includes(value)) {
      return surroundingAgent.Throw('TypeError', 'Cannot stringify a circular structure');
    }
    stack.push(value);
    const stepback = indent;
    indent = `${indent}${gap}`;
    const partial = [];
    const len = Q(Get(value, new Value('length'))).numberValue();
    let index = 0;
    while (index < len) {
      const indexStr = X(ToString(new Value(index)));
      const strP = Q(SerializeJSONProperty(indexStr, value));
      if (strP === Value.undefined) {
        partial.push('null');
      } else {
        partial.push(strP.stringValue());
      }
      index += 1;
    }
    let final;
    if (partial.length === 0) {
      final = new Value('[]');
    } else {
      if (gap === '') {
        const properties = partial.join(',');
        final = new Value(`[${properties}]`);
      } else {
        const separator = `,\u000A${indent}`;
        const properties = partial.join(separator);
        final = new Value(`[\u000A${indent}${properties}\u000A${stepback}]`);
      }
    }
    stack.pop();
    indent = stepback;
    return final;
  }

  const stack = [];
  let indent = '';
  let PropertyList = Value.undefined;
  let ReplacerFunction = Value.undefined;
  if (Type(replacer) === 'Object') {
    if (IsCallable(replacer) === Value.true) {
      ReplacerFunction = replacer;
    } else {
      const isArray = Q(IsArray(replacer));
      if (isArray === Value.true) {
        PropertyList = [];
        const len = Q(ToLength(Q(Get(replacer, new Value('length'))))).numberValue();
        let k = 0;
        while (k < len) {
          const v = Q(Get(replacer, X(ToString(new Value(k)))));
          let item = Value.undefined;
          if (Type(v) === 'String') {
            item = v;
          } else if (Type(v) === 'Number') {
            item = X(ToString(v));
          } else if (Type(v) === 'Object') {
            if ('StringData' in v || 'NumberData' in v) {
              item = Q(ToString(v));
            }
          }
          if (Type(item) !== 'undefined' && !PropertyList.includes(item)) {
            PropertyList.push(item);
          }
          k += 1;
        }
      }
    }
  }
  if (Type(space) === 'Object') {
    if ('NumberData' in space) {
      space = Q(ToNumber(space));
    } else if ('StringData' in space) {
      space = Q(ToString(space));
    }
  }
  let gap;
  if (Type(space) === 'Number') {
    space = Math.min(10, X(ToInteger(space)).numberValue());
    gap = ' '.repeat(space >= 0 ? space : 0);
  } else if (Type(space) === 'String') {
    if (space.stringValue().length <= 10) {
      gap = space.stringValue();
    } else {
      gap = space.stringValue().slice(0, 10);
    }
  } else {
    gap = '';
  }
  const wrapper = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  const status = CreateDataProperty(wrapper, new Value(''), value);
  Assert(status === Value.true);
  return Q(SerializeJSONProperty(new Value(''), wrapper));
}

export function CreateJSON(realmRec) {
  const json = BootstrapPrototype(realmRec, [
    ['parse', JSON_parse, 2],
    ['stringify', JSON_stringify, 3],
  ], realmRec.Intrinsics['%ObjectPrototype%'], 'JSON');

  realmRec.Intrinsics['%JSON%'] = json;
  realmRec.Intrinsics['%JSONParse%'] = X(json.Get(new Value('parse')));
}
