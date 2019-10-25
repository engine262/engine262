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
  GetV,
  IsArray,
  IsCallable,
  ObjectCreate,
  LengthOfArrayLike,
  ToInteger,
  ToNumber,
  ToString,
  UTF16Encoding,
} from '../abstract-ops/all.mjs';
import {
  NormalCompletion,
  EnsureCompletion,
  Q, X,
} from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { ValueSet, msg } from '../helpers.mjs';

const WHITESPACE = [' ', '\t', '\r', '\n'];
const NUMERIC = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const NUMERIC_EXTENDED = [...NUMERIC, '-', 'e', '.'];
const VALID_HEX = [...NUMERIC, 'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f'];
const ESCAPABLE = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't'];

class JSONValidator {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.char = input.charAt(0);
  }

  validate() {
    X(this.eatWhitespace());
    Q(this.parseValue());
    if (this.pos < this.input.length) {
      return surroundingAgent.Throw('SyntaxError', 'JSON input doesn\'t end!');
    }
    return new NormalCompletion(undefined);
  }

  advance() {
    this.pos += 1;
    if (this.pos === this.input.length) {
      this.char = null;
    } else if (this.pos > this.input.length) {
      return surroundingAgent.Throw('SyntaxError', 'JSON got unexpected EOF');
    } else {
      this.char = this.input.charAt(this.pos);
    }
    return this.char;
  }

  eatWhitespace() {
    while (this.eat(WHITESPACE));
  }

  eat(c) {
    if (Array.isArray(c) && c.includes(this.char)) {
      X(this.advance());
      return true;
    } else if (this.char === c) {
      X(this.advance());
      return true;
    }
    return false;
  }

  expect(c) {
    const { char } = this;
    if (!this.eat(c)) {
      return surroundingAgent.Throw('SyntaxError', `Expected ${c} but got ${this.char}`);
    }
    return char;
  }

  parseValue() {
    switch (this.char) {
      case '"':
        return Q(this.parseString());
      case '{':
        return Q(this.parseObject());
      case '[':
        return Q(this.parseArray());
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '-':
        return Q(this.parseNumber());
      case 'f':
        if (this.eat('f') && this.eat('a') && this.eat('l') && this.eat('s') && this.eat('e')) {
          return X(this.eatWhitespace());
        } else {
          return surroundingAgent.Throw('SyntaxError', `Unexpected ${this.char} when parsing false`);
        }
      case 't':
        if (this.eat('t') && this.eat('r') && this.eat('u') && this.eat('e')) {
          return X(this.eatWhitespace());
        } else {
          return surroundingAgent.Throw('SyntaxError', `Unexpected ${this.char} when parsing true`);
        }
      case 'n':
        if (this.eat('n') && this.eat('u') && this.eat('l') && this.eat('l')) {
          return X(this.eatWhitespace());
        } else {
          return surroundingAgent.Throw('SyntaxError', `Unexpected ${this.char} when parsing null`);
        }
      default:
        return surroundingAgent.Throw('SyntaxError', `Unexpected character ${this.char}`);
    }
  }

  parseString() {
    Q(this.expect('"'));
    while (!this.eat('"')) {
      if (this.eat('\\')) {
        if (!this.eat(ESCAPABLE)) {
          Q(this.expect('u'));
          Q(this.expect(VALID_HEX));
          Q(this.expect(VALID_HEX));
          Q(this.expect(VALID_HEX));
          Q(this.expect(VALID_HEX));
        }
      } else {
        if (this.char < ' ') {
          return surroundingAgent.Throw('SyntaxError', `Unexpected character ${this.char} in JSON`);
        }
        Q(this.advance());
      }
    }
    return X(this.eatWhitespace());
  }

  parseNumber() {
    Q(this.expect(NUMERIC_EXTENDED));
    while (this.eat(NUMERIC_EXTENDED));
    X(this.eatWhitespace());
  }

  parseObject() {
    Q(this.expect('{'));
    X(this.eatWhitespace());
    let first = true;
    while (!this.eat('}')) {
      if (first) {
        first = false;
      } else {
        Q(this.expect(','));
        X(this.eatWhitespace());
      }
      Q(this.parseString());
      X(this.eatWhitespace());
      Q(this.expect(':'));
      X(this.eatWhitespace());
      Q(this.parseValue());
      X(this.eatWhitespace());
    }
    X(this.eatWhitespace());
  }

  parseArray() {
    Q(this.expect('['));
    X(this.eatWhitespace());
    let first = true;
    while (!this.eat(']')) {
      if (first) {
        first = false;
      } else {
        Q(this.expect(','));
        X(this.eatWhitespace());
      }
      Q(this.parseValue());
      X(this.eatWhitespace());
    }
    X(this.eatWhitespace());
  }

  static validate(input) {
    const v = new JSONValidator(input);
    return v.validate();
  }
}

function JSON_parse([text = Value.undefined, reviver = Value.undefined]) {
  function InternalizeJSONProperty(holder, name) {
    const val = Q(Get(holder, name));
    if (Type(val) === 'Object') {
      const isArray = Q(IsArray(val));
      if (isArray === Value.true) {
        let I = 0;
        const len = Q(LengthOfArrayLike(val)).numberValue();
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
  Q(JSONValidator.validate(jText.stringValue()));
  const scriptText = `(${jText.stringValue()});`;
  const completion = EnsureCompletion(ScriptEvaluationJob(scriptText));
  const unfiltered = completion.Value;
  Assert(unfiltered instanceof StringValue
         || unfiltered instanceof NumberValue
         || unfiltered instanceof BooleanValue
         || unfiltered instanceof NullValue
         || unfiltered instanceof ObjectValue);
  if (IsCallable(reviver) === Value.true) {
    const root = ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    const rootName = new Value('');
    const status = X(CreateDataProperty(root, rootName, unfiltered));
    Assert(status === Value.true);
    return Q(InternalizeJSONProperty(root, rootName));
  } else {
    return unfiltered;
  }
}

const codeUnitTable = new Map([
  [0x0008, '\\b'],
  [0x0009, '\\t'],
  [0x000A, '\\n'],
  [0x000C, '\\f'],
  [0x000D, '\\r'],
  [0x0022, '\\"'],
  [0x005C, '\\\\'],
]);

function JSON_stringify([value = Value.undefined, replacer = Value.undefined, space = Value.undefined]) {
  // 24.5.2.1 #sec-serializejsonproperty
  function SerializeJSONProperty(key, holder) {
    let value = Q(Get(holder, key)); // eslint-disable-line no-shadow
    if (Type(value) === 'Object' || Type(value) === 'BigInt') {
      const toJSON = Q(GetV(value, new Value('toJSON')));
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
      } else if ('BigIntData' in value) {
        value = value.BigIntData;
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
      if (value.isFinite()) {
        return X(ToString(value));
      }
      return new Value('null');
    }
    if (Type(value) === 'BigInt') {
      return surroundingAgent.Throw('TypeError', msg('CannotJSONSerializeBigInt'));
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
    const cpList = [...value.stringValue()].map((c) => c.codePointAt(0));
    for (const C of cpList) {
      if (codeUnitTable.has(C)) {
        product = `${product}${codeUnitTable.get(C)}`;
      } else if (C < 0x0020 || (C >= 0xD800 && C <= 0xDBFF) || (C >= 0xDC00 && C <= 0xDFFF)) {
        const unit = String.fromCodePoint(C);
        product = `${product}${UnicodeEscape(unit)}`;
      } else {
        product = `${product}${String.fromCodePoint(...UTF16Encoding(C))}`;
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
    const len = Q(LengthOfArrayLike(value)).numberValue();
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
        PropertyList = new ValueSet();
        const len = Q(LengthOfArrayLike(replacer)).numberValue();
        let k = 0;
        while (k < len) {
          const vStr = X(ToString(new Value(k)));
          const v = Q(Get(replacer, vStr));
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
          if (item !== Value.undefined && !PropertyList.has(item)) {
            PropertyList.add(item);
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
    if (space < 1) {
      gap = '';
    } else {
      gap = ' '.repeat(space);
    }
  } else if (Type(space) === 'String') {
    if (space.stringValue().length <= 10) {
      gap = space.stringValue();
    } else {
      gap = space.stringValue().slice(0, 10);
    }
  } else {
    gap = '';
  }
  const wrapper = ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  const status = X(CreateDataProperty(wrapper, new Value(''), value));
  Assert(status === Value.true);
  return Q(SerializeJSONProperty(new Value(''), wrapper));
}

export function CreateJSON(realmRec) {
  const json = BootstrapPrototype(realmRec, [
    ['parse', JSON_parse, 2],
    ['stringify', JSON_stringify, 3],
  ], realmRec.Intrinsics['%Object.prototype%'], 'JSON');

  realmRec.Intrinsics['%JSON%'] = json;
  realmRec.Intrinsics['%JSON.parse%'] = X(json.Get(new Value('parse')));
}
