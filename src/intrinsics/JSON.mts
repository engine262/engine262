import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BooleanValue,
  NullValue,
  NumberValue,
  ObjectValue,
  JSStringValue,
  UndefinedValue,
  Value,
} from '../value.mts';
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
} from '../abstract-ops/all.mts';
import {
  UTF16EncodeCodePoint,
} from '../static-semantics/all.mts';
import {
  NormalCompletion,
  Q, X,
} from '../completion.mts';
import { isArray, JSStringSet, kInternal } from '../helpers.mts';
import {
  BigIntValue, F, ParseScript, Realm, ScriptEvaluation, ThrowCompletion, skipDebugger, type Arguments,
  type CodePoint,
  type FunctionObject,
  type PlainCompletion,
  isLeadingSurrogate,
  isTrailingSurrogate,
  type ParseNode,
  type BuiltinFunctionObject,
} from '../index.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { Contains } from '../parser/utils.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { isBooleanObject } from './Boolean.mts';
import { isBigIntObject } from './BigInt.mts';

const WHITESPACE = [' ', '\t', '\r', '\n'];
const NUMERIC = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const VALID_HEX = [...NUMERIC, 'A', 'B', 'C', 'D', 'E', 'F', 'a', 'b', 'c', 'd', 'e', 'f'];
const ESCAPABLE = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't'];

class JSONValidator {
  input;

  pos = 0;

  char: string | null;

  constructor(input: string) {
    this.input = input;
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

  eat(c: string | readonly string[]) {
    if (Array.isArray(c) && c.includes(this.char)) {
      X(this.advance());
      return true;
    } else if (this.char === c) {
      X(this.advance());
      return true;
    }
    return false;
  }

  expect(c: string | readonly string[]) {
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
        if (this.char! < ' ') {
          return surroundingAgent.Throw('SyntaxError', 'JSONUnexpectedChar', this.char);
        }
        Q(this.advance());
      }
    }
    return X(this.eatWhitespace());
  }

  parseNumber(): PlainCompletion<void> {
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

  parseObject(): PlainCompletion<void> {
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

  parseArray(): PlainCompletion<void> {
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

  static validate(input: string) {
    const v = new JSONValidator(input);
    return v.validate();
  }
}

function* InternalizeJSONProperty(holder: ObjectValue, name: JSStringValue, reviver: Value): ValueEvaluator {
  const val = Q(yield* Get(holder, name));
  if (val instanceof ObjectValue) {
    const isArray = Q(IsArray(val));
    if (isArray === Value.true) {
      let I = 0;
      const len = Q(yield* LengthOfArrayLike(val));
      while (I < len) {
        const Istr = X(ToString(F(I)));
        const newElement = Q(yield* InternalizeJSONProperty(val, Istr, reviver));
        if (newElement instanceof UndefinedValue) {
          Q(yield* val.Delete(Istr));
        } else {
          Q(yield* CreateDataProperty(val, Istr, newElement));
        }
        I += 1;
      }
    } else {
      const keys = Q(yield* EnumerableOwnPropertyNames(val, 'key'));
      for (const P of keys) {
        const newElement = Q(yield* InternalizeJSONProperty(val, P, reviver));
        if (newElement instanceof UndefinedValue) {
          Q(yield* val.Delete(P));
        } else {
          Q(yield* CreateDataProperty(val, P, newElement));
        }
      }
    }
  }
  return Q(yield* Call(reviver, holder, [name, val]));
}

/** https://tc39.es/ecma262/#sec-json.parse */
function* JSON_parse([text = Value.undefined, reviver = Value.undefined]: Arguments): ValueEvaluator {
  // 1. Let jsonString be ? ToString(text).
  const jsonString = Q(yield* ToString(text));
  // 2. Parse ! UTF16DecodeString(jsonString) as a JSON text as specified in ECMA-404.
  //    Throw a SyntaxError exception if it is not a valid JSON text as defined in that specification.
  Q(JSONValidator.validate(jsonString.stringValue()));
  // 3. Let scriptString be the string-concatenation of "(", jsonString, and ");".
  const scriptString = `(${jsonString.stringValue()});`;
  // 4. Let completion be the result of parsing and evaluating
  //    ! UTF16DecodeString(scriptString) as if it was the source text of an ECMAScript Script. The
  //    extended PropertyDefinitionEvaluation semantics defined in B.3.1 must not be used during the evaluation.
  const parsed = ParseScript(scriptString, surroundingAgent.currentRealmRecord, { [kInternal]: { json: true } });
  Assert(!isArray(parsed)); // array means parse error
  const completion = X(skipDebugger(ScriptEvaluation(parsed)));
  // 5. Let unfiltered be completion.[[Value]].
  const unfiltered = completion;
  // 6. Assert: unfiltered is either a String, Number, Boolean, Null, or an Object that is defined by either an ArrayLiteral or an ObjectLiteral.
  Assert(unfiltered instanceof JSStringValue
    || unfiltered instanceof NumberValue
    || unfiltered instanceof BooleanValue
    || unfiltered instanceof NullValue
    || unfiltered instanceof ObjectValue);
  // 7. If IsCallable(reviver) is true, then
  if (IsCallable(reviver)) {
    // a. Let root be OrdinaryObjectCreate(%Object.prototype%).
    const root = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
    // b. Let rootName be the empty String.
    const rootName = Value('');
    // c. Perform ! CreateDataPropertyOrThrow(root, rootName, unfiltered).
    X(CreateDataPropertyOrThrow(root, rootName, unfiltered));
    // d. Return ? InternalizeJSONProperty(root, rootName, reviver).
    return Q(yield* InternalizeJSONProperty(root, rootName, reviver));
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

interface State {
  ReplacerFunction: ObjectValue | UndefinedValue;
  Stack: ObjectValue[];
  Indent: string;
  Gap: string;
  PropertyList: JSStringSet | UndefinedValue;
}
/** https://tc39.es/ecma262/#sec-serializejsonproperty */
function* SerializeJSONProperty(state: State, key: JSStringValue, holder: ObjectValue): ValueEvaluator<JSStringValue | UndefinedValue> {
  let value = Q(yield* Get(holder, key)); // eslint-disable-line no-shadow
  if (value instanceof ObjectValue || value instanceof BigIntValue) {
    const toJSON = Q(yield* GetV(value, Value('toJSON')));
    if (IsCallable(toJSON)) {
      value = Q(yield* Call(toJSON, value, [key]));
    }
  }
  if (state.ReplacerFunction !== Value.undefined) {
    value = Q(yield* Call(state.ReplacerFunction, holder, [key, value]));
  }
  if (value instanceof ObjectValue) {
    if ('NumberData' in value) {
      value = Q(yield* ToNumber(value));
    } else if ('StringData' in value) {
      value = Q(yield* ToString(value));
    } else if (isBooleanObject(value)) {
      value = value.BooleanData;
    } else if (isBigIntObject(value)) {
      value = value.BigIntData;
    }
  }
  if (value === Value.null) {
    return Value('null');
  }
  if (value === Value.true) {
    return Value('true');
  }
  if (value === Value.false) {
    return Value('false');
  }
  if (value instanceof JSStringValue) {
    return QuoteJSONString(value);
  }
  if (value instanceof NumberValue) {
    if (value.isFinite()) {
      return X(ToString(value));
    }
    return Value('null');
  }
  if (value instanceof BigIntValue) {
    return surroundingAgent.Throw('TypeError', 'CannotJSONSerializeBigInt');
  }
  if (value instanceof ObjectValue && !IsCallable(value)) {
    const isArray = Q(IsArray(value));
    if (isArray === Value.true) {
      return Q(yield* SerializeJSONArray(state, value));
    }
    return Q(yield* SerializeJSONObject(state, value));
  }
  return Value.undefined;
}

export function UnicodeEscape(C: string) {
  const n = C.charCodeAt(0);
  Assert(n < 0xFFFF);
  return `\u005Cu${n.toString(16).padStart(4, '0')}`;
}

function QuoteJSONString(value: JSStringValue) { // eslint-disable-line no-shadow
  let product = '\u0022';
  const cpList = [...value.stringValue()].map((c) => c.codePointAt(0)!);
  for (const C of cpList) {
    if (codeUnitTable.has(C)) {
      product = `${product}${codeUnitTable.get(C)}`;
    } else if (C < 0x0020 || isLeadingSurrogate(C) || isTrailingSurrogate(C)) {
      const unit = String.fromCodePoint(C);
      product += UnicodeEscape(unit);
    } else {
      product += UTF16EncodeCodePoint(C as CodePoint);
    }
  }
  product = `${product}\u0022`;
  return Value(product);
}

/** https://tc39.es/ecma262/#sec-serializejsonobject */
function* SerializeJSONObject(state: State, value: ObjectValue): ValueEvaluator<JSStringValue> {
  if (state.Stack.includes(value)) {
    return surroundingAgent.Throw('TypeError', 'JSONCircular');
  }
  state.Stack.push(value);
  const stepback = state.Indent;
  state.Indent = `${state.Indent}${state.Gap}`;
  let K: IterableIterator<JSStringValue>;
  if (!(state.PropertyList instanceof UndefinedValue)) {
    K = state.PropertyList.keys();
  } else {
    K = Q(yield* EnumerableOwnPropertyNames(value, 'key')).values();
  }
  const partial = [];
  for (const P of K) {
    const strP = Q(yield* SerializeJSONProperty(state, P, value));
    if (!(strP instanceof UndefinedValue)) {
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
    final = Value('{}');
  } else {
    if (state.Gap === '') {
      const properties = partial.join(',');
      final = Value(`{${properties}}`);
    } else {
      const separator = `,\u000A${state.Indent}`;
      const properties = partial.join(separator);
      final = Value(`{\u000A${state.Indent}${properties}\u000A${stepback}}`);
    }
  }
  state.Stack.pop();
  state.Indent = stepback;
  return final;
}

/** https://tc39.es/ecma262/#sec-serializejsonarray */
function* SerializeJSONArray(state: State, value: ObjectValue): PlainEvaluator<JSStringValue | ThrowCompletion> {
  if (state.Stack.includes(value)) {
    return surroundingAgent.Throw('TypeError', 'JSONCircular');
  }
  state.Stack.push(value);
  const stepback = state.Indent;
  state.Indent = `${state.Indent}${state.Gap}`;
  const partial = [];
  const len = Q(yield* LengthOfArrayLike(value));
  let index = 0;
  while (index < len) {
    const indexStr = X(ToString(F(index)));
    const strP = Q(yield* SerializeJSONProperty(state, indexStr, value));
    if (strP instanceof UndefinedValue) {
      partial.push('null');
    } else {
      partial.push(strP.stringValue());
    }
    index += 1;
  }
  let final;
  if (partial.length === 0) {
    final = Value('[]');
  } else {
    if (state.Gap === '') {
      const properties = partial.join(',');
      final = Value(`[${properties}]`);
    } else {
      const separator = `,\u000A${state.Indent}`;
      const properties = partial.join(separator);
      final = Value(`[\u000A${state.Indent}${properties}\u000A${stepback}]`);
    }
  }
  state.Stack.pop();
  state.Indent = stepback;
  return final;
}

/** https://tc39.es/ecma262/#sec-json.stringify */
function* JSON_stringify([value = Value.undefined, replacer = Value.undefined, _space = Value.undefined]: Arguments): ValueEvaluator {
  const stack: ObjectValue[] = [];
  const indent = '';
  let PropertyList: JSStringSet | UndefinedValue = Value.undefined;
  let ReplacerFunction: ObjectValue | UndefinedValue = Value.undefined;
  if (replacer instanceof ObjectValue) {
    if (IsCallable(replacer)) {
      ReplacerFunction = replacer;
    } else {
      const isArray = Q(IsArray(replacer));
      if (isArray === Value.true) {
        PropertyList = new JSStringSet();
        const len = Q(yield* LengthOfArrayLike(replacer));
        let k = 0;
        while (k < len) {
          const vStr = X(ToString(F(k)));
          const v = Q(yield* Get(replacer, vStr));
          let item: JSStringValue | UndefinedValue = Value.undefined;
          if (v instanceof JSStringValue) {
            item = v;
          } else if (v instanceof NumberValue) {
            item = X(ToString(v));
          } else if (v instanceof ObjectValue) {
            if ('StringData' in v || 'NumberData' in v) {
              item = Q(yield* ToString(v));
            }
          }
          if (!(item instanceof UndefinedValue) && !PropertyList.has(item)) {
            PropertyList.add(item);
          }
          k += 1;
        }
      }
    }
  }
  let space: Value | number = _space;
  if (space instanceof ObjectValue) {
    if ('NumberData' in space) {
      space = Q(yield* ToNumber(space));
    } else if ('StringData' in space) {
      space = Q(yield* ToString(space));
    }
  }
  let gap: string;
  if (space instanceof NumberValue) {
    space = Math.min(10, X(ToIntegerOrInfinity(space)));
    if (space < 1) {
      gap = '';
    } else {
      gap = ' '.repeat(space);
    }
  } else if (space instanceof JSStringValue) {
    if (space.stringValue().length <= 10) {
      gap = space.stringValue();
    } else {
      gap = space.stringValue().slice(0, 10);
    }
  } else {
    gap = '';
  }
  const wrapper = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  X(CreateDataPropertyOrThrow(wrapper, Value(''), value));
  const state: State = {
    ReplacerFunction, Stack: stack, Indent: indent, Gap: gap, PropertyList,
  };
  return Q(yield* SerializeJSONProperty(state, Value(''), wrapper));
}

function ShallowestContainedJSONValue(node: ParseNode): ParseNode | undefined {
  const F = surroundingAgent.activeFunctionObject;
  Assert((F as BuiltinFunctionObject).nativeFunction === JSON_parse);
  const types: ParseNode['type'][] = [
    'NullLiteral', 'BooleanLiteral', 'NumericLiteral', 'StringLiteral', 'ArrayLiteral', 'ObjectLiteral', 'UnaryExpression',
  ];
  let unaryExpression: ParseNode | undefined;
  let queue = [node];
  while (queue.length > 0) {
    const candidate = queue.shift()!;
    let queuedChildren = false;
    for (const type of types) {
      if (candidate?.type === type) {
        if (type === 'UnaryExpression') {
          unaryExpression = candidate;
        } else if (type === 'NumericLiteral') {
          // TODO: https://github.com/tc39/proposal-json-parse-with-source/issues/48 ?
          Assert(!!unaryExpression && Contains(unaryExpression, candidate.type));
          return unaryExpression;
        } else {
          return candidate;
        }
      }
      if (!queuedChildren && isNonTerminal(candidate) && Contains(candidate, type)) {
        const children = Object.values(candidate).filter((value) => 'type' in value);
        queue = queue.concat(children);
        queuedChildren = true;
      }
    }
  }
  return undefined;

  function isNonTerminal(node: ParseNode) {
    return Object.values(node).some((value) => 'type' in value);
  }
}

export function bootstrapJSON(realmRec: Realm) {
  const json = bootstrapPrototype(realmRec, [
    ['parse', JSON_parse, 2],
    ['stringify', JSON_stringify, 3],
  ], realmRec.Intrinsics['%Object.prototype%'], 'JSON');

  realmRec.Intrinsics['%JSON%'] = json;
  realmRec.Intrinsics['%JSON.parse%'] = X(Get(json, Value('parse'))) as FunctionObject;
  realmRec.Intrinsics['%JSON.stringify%'] = X(Get(json, Value('stringify'))) as FunctionObject;
}
