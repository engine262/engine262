import { surroundingAgent, ScriptEvaluationJob } from '../engine.mjs';
import {
  Type,
  wellKnownSymbols,
  Descriptor,
  Value,
  StringValue,
  NumberValue,
  BooleanValue,
  NullValue,
  ObjectValue,
} from '../value.mjs';
import {
  Assert,
  Call,
  CreateBuiltinFunction,
  CreateDataProperty,
  EnumerableOwnPropertyNames,
  Get,
  IsArray,
  IsCallable,
  ObjectCreate,
  ToLength,
  ToString,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { Q, X, EnsureCompletion } from '../completion.mjs';

function JSON_parse([text, reviver]) {
  function InternalizeJSONProperty(holder, name) {
    const val = Q(Get(holder, name));
    if (Type(val) === 'Object') {
      const isArray = Q(IsArray(val));
      if (isArray.isTrue()) {
        let I = 0;
        const len = Q(ToLength(Q(Get(val, new Value('length'))))).numberValue();
        while (I < len) {
          const newElement = Q(InternalizeJSONProperty(val, X(ToString(new Value(I)))));
          if (Type(newElement) === 'Undefined') {
            Q(val.Delete(X(ToString(new Value(I)))));
          } else {
            Q(CreateDataProperty(val, X(ToString(new Value(I))), newElement));
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
  if (IsCallable(reviver).isTrue()) {
    const root = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
    const rootName = new Value('');
    const status = CreateDataProperty(root, rootName, unfiltered);
    Assert(status.isTrue());
    return Q(InternalizeJSONProperty(root, rootName));
  } else {
    return unfiltered;
  }
}

/*
function JSON_stringify([value, replacer, space]) {
  // #sec-serializejsonproperty
  function SerializeJSONProperty(holder, key) {
    let value = Q(Get(holder, key));
    if (Type(value) === 'Object') {
      const toJSON = Q(Get(value, new Value('toJSON')));
      if (IsCallable(toJSON).isTrue()) {
        value = Q(Call(toJSON, value, [key]));
      }
    }
    if (Type(ReplacerFunction) !== 'Undefined') {
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
    if (value === new Value(null)) {
      return new Value('null');
    }
    if (value === new Value(true)) {
      return new Value('true');
    }
    if (value === new Value(false)) {
      return new Value(false);
    }
    if (Type(value) === 'String') {
      return QuoteJSONString(value);
    }
    if (Type(value) === 'Number') {
      if (!value.isInfinite()) {
        return X(ToString(value));
      }
      return new Value('null');
    }
    if (Type(value) === 'Object' && IsCallable(value).isFalse()) {
      const isArray = Q(IsArray(value));
      if (isArray.isTrue()) {
        return Q(SerializeJSONArray(value));
      }
      return Q(SerializeJSONObject(value));
    }
    return new Value(undefined);
  }

  // #sec-serializejsonobject
  function SerializeJSONObject(value) {
    if (stack.includes(value)) {
      return surroundingAgent.Throw('TypeError', 'Cannot stringify a circular structure');
    }
    value.push(stack);
    const stepback = indent;
    indent = `${indent}${gap}`;
    let K;
    if (Type(PropertyList) !== 'Undefined') {
      K = PropertyList;
    } else {
      K = Q(EnumerableOwnPropertyNames(value, 'key'));
    }
    const partial = [];
    for (const P of K) {
      const strP = Q(SerializeJSONProperty(P, value));
      if (Type(strP) !== 'Undefined') {
        let member = QuoteJSONString(P);
        member = `${member}:`;
      }
    }
    let final;
    if (partial.length === 0) {
      final = new Value('{}');
    } else {
    }
    stack.pop();
    indent = stepback;
    return final;
  }

  const stack = [];
  let indent = '';
  let PropertyList = new Value(undefined);
  let ReplacerFunction = new Value(undefined);
  if (Type(replacer) === 'Object') {
    if (IsCallable(replacer).isTrue()) {
      ReplacerFunction = replacer;
    }
  } else {
    const isArray = Q(IsArray(replacer));
    if (isArray.isTrue()) {
      PropertyList = [];
      const len = Q(ToLength(Q(Get(replacer, new Value('length'))))).numberValue();
      let k = 0;
      while (k < len) {
        const v = Q(Get(replacer, X(ToString(new Value(k)))));
        let item = new Value(undefined);
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
  let gap;
  if (Type(space) === 'Object') {
    if ('NumberData' in space) {
      space = Q(ToNumber(space));
    } else if ('StringData' in space) {
      space = Q(ToString(space));
    }
  }
  if (Type(space) === 'Number') {
    space = new Value(Math.min(10, X(ToInteger(space)).numberValue()));
    gap = new Value(' '.repeat(space));
  } else if (Type(space) === 'String') {
    if (space.stringValue().length <= 10) {
      gap = space;
    } else {
      gap = new Value(space.stringValue().slice(0, 10));
    }
  } else {
    gap = new Value('');
  }
  const wrapper = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  const status = CreateDataProperty(wrapper, new Value(''), value);
  Assert(status.isTrue());
  return Q(SerializeJSONProperty(new Value(''), wrapper));
}
*/

export function CreateJSON(realmRec) {
  const json = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

  const parse = CreateBuiltinFunction(JSON_parse, [], realmRec);
  SetFunctionName(parse, new Value('parse'));
  SetFunctionLength(parse, new Value(2));

  json.DefineOwnProperty(new Value('parse'), Descriptor({
    Value: parse,
    Writable: new Value(true),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  }));

  /*
  const stringify = CreateBuiltinFunction(JSON_stringify, [], realmRec);
  SetFunctionName(stringify, new Value('stringify'));
  SetFunctionLength(stringify, new Value(3));

  json.DefineOwnProperty(new Value('stringify'), Descriptor({
    Value: stringify,
    Writable: new Value(true),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  }));
  */

  json.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
    Value: new Value('JSON'),
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  }));

  realmRec.Intrinsics['%JSON%'] = json;
  realmRec.Intrinsics['%JSONParse%'] = parse;
}
