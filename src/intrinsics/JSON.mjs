import { surroundingAgent } from '../engine.mjs';
import {
  BooleanValue,
  NullValue,
  NumberValue,
  ObjectValue,
  JSStringValue,
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  Call,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  EnumerableOwnPropertyNames,
  Get,
  GetV,
  IsArray,
  IsCallable,
  OrdinaryObjectCreate,
  LengthOfArrayLike,
  ToIntegerOrInfinity,
  ToNumber,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  isLeadingSurrogate,
  isTrailingSurrogate,
} from '../parser/Lexer.mjs';
import {
  CodePointToUTF16CodeUnits,
} from '../static-semantics/all.mjs';
import {
  NormalCompletion,
  Q, X,
} from '../completion.mjs';
import { ValueSet, kInternal } from '../helpers.mjs';
import { evaluateScript, 𝔽 } from '../api.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

const WHITESPACE = [' ', '\t', '\r', '\n'];
const NUMERIC = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
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
      return surroundingAgent.Throw('SyntaxError', 'JSONUnexpectedToken');
    }
    return NormalCompletion(undefined);
  }

  advance() {
    this.pos += 1;
    if (this.pos === this.input.length) {
      this.char = null;
    } else if (this.pos > this.input.length) {
      return surroundingAgent.Throw('SyntaxError', 'JSONUnexpectedToken');
    } else {
      this.char = this.input.charAt(this.pos);
    }
    return this.char;
  }

  eatWhitespace() {
    while (this.eat(WHITESPACE)) {
      // nothing
    }
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
      return surroundingAgent.Throw('SyntaxError', 'JSONExpected', c, this.char);
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
        X(this.expect('f'));
        Q(this.expect('a'));
        Q(this.expect('l'));
        Q(this.expect('s'));
        Q(this.expect('e'));
        return X(this.eatWhitespace());
      case 't':
        X(this.expect('t'));
        Q(this.expect('r'));
        Q(this.expect('u'));
        Q(this.expect('e'));
        return X(this.eatWhitespace());
      case 'n':
        X(this.expect('n'));
        Q(this.expect('u'));
        Q(this.expect('l'));
        Q(this.expect('l'));
        return X(this.eatWhitespace());
      default:
        return surroundingAgent.Throw('SyntaxError', 'JSONUnexpectedChar', this.char);
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
          return surroundingAgent.Throw('SyntaxError', 'JSONUnexpectedChar', this.char);
        }
        Q(this.advance());
      }
    }
    return X(this.eatWhitespace());
  }

  parseNumber() {
    this.eat('-');
    if (!this.eat('0')) {
      Q(this.expect(NUMERIC));
      while (this.eat(NUMERIC)) {
        // nothing
      }
    }
    if (this.eat('.')) {
      Q(this.expect(NUMERIC));
      while (this.eat(NUMERIC)) {
        // nothing
      }
    }
    if (this.eat(['e', 'E'])) {
      this.eat(['-', '+']);
      Q(this.expect(NUMERIC));
      while (this.eat(NUMERIC)) {
        // nothing
      }
    }
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

function InternalizeJSONProperty(holder, name, reviver) {
  const val = Q(Get(holder, name));
  if (Type(val) === 'Object') {
    const isArray = Q(IsArray(val));
    if (isArray === Value.true) {
      let I = 0;
      const len = Q(LengthOfArrayLike(val));
      while (I < len) {
        const Istr = X(ToString(𝔽(I)));
        const newElement = Q(InternalizeJSONProperty(val, Istr, reviver));
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
        const newElement = Q(InternalizeJSONProperty(val, P, reviver));
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

// #sec-json.parse
function JSON_parse([text = Value.undefined, reviver = Value.undefined]) {
  // 1. Let jsonString be ? ToString(text).
  const jsonString = Q(ToString(text));
  // 2. Parse ! UTF16DecodeString(jsonString) as a JSON text as specified in ECMA-404.
  //    Throw a SyntaxError exception if it is not a valid JSON text as defined in that specification.
  Q(JSONValidator.validate(jsonString.stringValue()));
  // 3. Let scriptString be the string-concatenation of "(", jsonString, and ");".
  const scriptString = `(${jsonString.stringValue()});`;
  // 4. Let completion be the result of parsing and evaluating
  //    ! UTF16DecodeString(scriptString) as if it was the source text of an ECMAScript Script. The
  //    extended PropertyDefinitionEvaluation semantics defined in B.3.1 must not be used during the evaluation.
  const completion = evaluateScript(scriptString, surroundingAgent.currentRealmRecord, { [kInternal]: { json: true } });
  // 5. Let unfiltered be completion.[[Value]].
  const unfiltered = completion.Value;
  // 6. Assert: unfiltered is either a String, Number, Boolean, Null, or an Object that is defined by either an ArrayLiteral or an ObjectLiteral.
  Assert(unfiltered instanceof JSStringValue
         || unfiltered instanceof NumberValue
         || unfiltered instanceof BooleanValue
         || unfiltered instanceof NullValue
         || unfiltered instanceof ObjectValue);
  // 7. If IsCallable(reviver) is true, then
  if (IsCallable(reviver) === Value.true) {
    // a. Let root be OrdinaryObjectCreate(%Object.prototype%).
    const root = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    // b. Let rootName be the empty String.
    const rootName = new Value('');
    // c. Perform ! CreateDataPropertyOrThrow(root, rootName, unfiltered).
    X(CreateDataPropertyOrThrow(root, rootName, unfiltered));
    // d. Return ? InternalizeJSONProperty(root, rootName, reviver).
    return Q(InternalizeJSONProperty(root, rootName, reviver));
  } else {
    // a. Return unfiltered.
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

// #sec-serializejsonproperty
function SerializeJSONProperty(state, key, holder) {
  let value = Q(Get(holder, key)); // eslint-disable-line no-shadow
  if (Type(value) === 'Object' || Type(value) === 'BigInt') {
    const toJSON = Q(GetV(value, new Value('toJSON')));
    if (IsCallable(toJSON) === Value.true) {
      value = Q(Call(toJSON, value, [key]));
    }
  }
  if (state.ReplacerFunction !== Value.undefined) {
    value = Q(Call(state.ReplacerFunction, holder, [key, value]));
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
    return surroundingAgent.Throw('TypeError', 'CannotJSONSerializeBigInt');
  }
  if (Type(value) === 'Object' && IsCallable(value) === Value.false) {
    const isArray = Q(IsArray(value));
    if (isArray === Value.true) {
      return Q(SerializeJSONArray(state, value));
    }
    return Q(SerializeJSONObject(state, value));
  }
  return Value.undefined;
}

function UnicodeEscape(C) {
  const n = C.charCodeAt(0);
  Assert(n < 0xFFFF);
  return `\u005Cu${n.toString(16).padStart(4, '0')}`;
}

function QuoteJSONString(value) { // eslint-disable-line no-shadow
  let product = '\u0022';
  const cpList = [...value.stringValue()].map((c) => c.codePointAt(0));
  for (const C of cpList) {
    if (codeUnitTable.has(C)) {
      product = `${product}${codeUnitTable.get(C)}`;
    } else if (C < 0x0020 || isLeadingSurrogate(C) || isTrailingSurrogate(C)) {
      const unit = String.fromCodePoint(C);
      product = `${product}${UnicodeEscape(unit)}`;
    } else {
      product = `${product}${String.fromCodePoint(...CodePointToUTF16CodeUnits(C))}`;
    }
  }
  product = `${product}\u0022`;
  return new Value(product);
}

// #sec-serializejsonobject
function SerializeJSONObject(state, value) {
  if (state.Stack.includes(value)) {
    return surroundingAgent.Throw('TypeError', 'JSONCircular');
  }
  state.Stack.push(value);
  const stepback = state.Indent;
  state.Indent = `${state.Indent}${state.Gap}`;
  let K;
  if (state.PropertyList !== Value.undefined) {
    K = state.PropertyList;
  } else {
    K = Q(EnumerableOwnPropertyNames(value, 'key'));
  }
  const partial = [];
  for (const P of K) {
    const strP = Q(SerializeJSONProperty(state, P, value));
    if (strP !== Value.undefined) {
      let member = QuoteJSONString(P).stringValue();
      member = `${member}:`;
      if (state.Gap !== '') {
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
    if (state.Gap === '') {
      const properties = partial.join(',');
      final = new Value(`{${properties}}`);
    } else {
      const separator = `,\u000A${state.Indent}`;
      const properties = partial.join(separator);
      final = new Value(`{\u000A${state.Indent}${properties}\u000A${stepback}}`);
    }
  }
  state.Stack.pop();
  state.Indent = stepback;
  return final;
}

// #sec-serializejsonarray
function SerializeJSONArray(state, value) {
  if (state.Stack.includes(value)) {
    return surroundingAgent.Throw('TypeError', 'JSONCircular');
  }
  state.Stack.push(value);
  const stepback = state.Indent;
  state.Indent = `${state.Indent}${state.Gap}`;
  const partial = [];
  const len = Q(LengthOfArrayLike(value));
  let index = 0;
  while (index < len) {
    const indexStr = X(ToString(𝔽(index)));
    const strP = Q(SerializeJSONProperty(state, indexStr, value));
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
    if (state.Gap === '') {
      const properties = partial.join(',');
      final = new Value(`[${properties}]`);
    } else {
      const separator = `,\u000A${state.Indent}`;
      const properties = partial.join(separator);
      final = new Value(`[\u000A${state.Indent}${properties}\u000A${stepback}]`);
    }
  }
  state.Stack.pop();
  state.Indent = stepback;
  return final;
}

// #sec-json.stringify
function JSON_stringify([value = Value.undefined, replacer = Value.undefined, space = Value.undefined]) {
  const stack = [];
  const indent = '';
  let PropertyList = Value.undefined;
  let ReplacerFunction = Value.undefined;
  if (Type(replacer) === 'Object') {
    if (IsCallable(replacer) === Value.true) {
      ReplacerFunction = replacer;
    } else {
      const isArray = Q(IsArray(replacer));
      if (isArray === Value.true) {
        PropertyList = new ValueSet();
        const len = Q(LengthOfArrayLike(replacer));
        let k = 0;
        while (k < len) {
          const vStr = X(ToString(𝔽(k)));
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
    space = Math.min(10, X(ToIntegerOrInfinity(space)));
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
  const wrapper = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataPropertyOrThrow(wrapper, new Value(''), value));
  const state = {
    ReplacerFunction, Stack: stack, Indent: indent, Gap: gap, PropertyList,
  };
  return Q(SerializeJSONProperty(state, new Value(''), wrapper));
}

export function bootstrapJSON(realmRec) {
  const json = bootstrapPrototype(realmRec, [
    ['parse', JSON_parse, 2],
    ['stringify', JSON_stringify, 3],
  ], realmRec.Intrinsics['%Object.prototype%'], 'JSON');

  realmRec.Intrinsics['%JSON%'] = json;
}
