import * as acorn from 'acorn';
import { surroundingAgent } from './engine.mjs';
import { ExportEntryRecord, SourceTextModuleRecord } from './modules.mjs';
import { Value } from './value.mjs';
import {
  ModuleRequests_ModuleItemList,
  ImportEntries_ModuleItemList,
  ExportEntries_ModuleItemList,
  ImportedLocalNames,
} from './static-semantics/all.mjs';
import { ValueSet } from './helpers.mjs';

const HasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
function deepFreeze(o) {
  Object.freeze(o);
  Object.getOwnPropertyNames(o).forEach((prop) => {
    if (HasOwnProperty(o, prop)
        && o[prop] !== null
        && (typeof o[prop] === 'object' || typeof o[prop] === 'function')
        && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });
  return o;
}

// Copied from acorn/src/scopeflags.js.
const SCOPE_FUNCTION = 2;
const SCOPE_ASYNC = 4;
const SCOPE_GENERATOR = 8;

function functionFlags(async, generator) {
  // eslint-disable-next-line no-bitwise
  return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0);
}

const optionalChainToken = { label: '?.' };
const nullishCoalescingToken = { label: '??', binop: 0 };
const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

function isSyntaxCharacter(ch) {
  return (
    ch === 0x24 /* $ */
    || (ch >= 0x28 /* ( */ && ch <= 0x2B /* + */)
    || ch === 0x2E /* . */
    || ch === 0x3F /* ? */
    || (ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */)
    || (ch >= 0x7B /* { */ && ch <= 0x7D /* } */)
  );
}

function isCharacterClassEscape(ch) {
  return (
    ch === 0x64 /* d */
    || ch === 0x44 /* D */
    || ch === 0x73 /* s */
    || ch === 0x53 /* S */
    || ch === 0x77 /* w */
    || ch === 0x57 /* W */
  );
}

function isOctalDigit(ch) {
  return ch >= 0x30 /* 0 */ && ch <= 0x37; /* 7 */
}

export const Parser = acorn.Parser.extend((P) => (class Parse262 extends P {
  constructor(options = {}, source) {
    super({
      ...options,
      ecmaVersion: 2020,
      // adds needed ParenthesizedExpression production
      preserveParens: true,
      locations: true,
    }, source);
    if (options.strict === true) {
      this.strict = true;
    }
    this.containsTopLevelAwait = false;
  }

  parse() {
    const body = super.parse();
    body.containsTopLevelAwait = this.containsTopLevelAwait;
    deepFreeze(body);
    return body;
  }

  finishNode(node, type) {
    node.strict = this.strict;
    const ret = super.finishNode(node, type);
    node.sourceText = () => this.input.slice(node.start, node.end);
    if (ret.type === 'MethodDefinition' && ret.static) {
      ret.start += 7; // don't include `static` in the source text
    }
    if (ret.type === 'Literal' && typeof ret.value === 'bigint') {
      if (/^0[^xbo]/.test(ret.bigint)) {
        this.raise(ret.start, 'Invalid or unexpected token');
      }
    }
    return ret;
  }

  getTokenFromCode(code) {
    if (code === 63) { // ?
      this.pos += 1;
      const next = this.input.charCodeAt(this.pos);
      if (next === 46) { // .
        const nextNext = this.input.charCodeAt(this.pos + 1);
        if (nextNext < 48 || nextNext > 57) {
          this.pos += 1;
          return this.finishToken(optionalChainToken);
        }
      }
      if (next === 63) { // ??
        this.pos += 1;
        const nextNext = this.input.charCodeAt(this.pos);
        if (nextNext === 61 && surroundingAgent.feature('LogicalAssignment')) { // ??=
          this.pos -= 2;
          return this.finishOp(acorn.tokTypes.assign, 3);
        }
        return this.finishToken(nullishCoalescingToken, nullishCoalescingToken.label);
      }
      return this.finishToken(acorn.tokTypes.question);
    }
    return super.getTokenFromCode(code);
  }

  readToken_pipe_amp(code) {
    const next = this.input.charCodeAt(this.pos + 1);
    if (next === code) { // || or &&
      const nextNext = this.input.charCodeAt(this.pos + 2);
      // https://tc39.es/proposal-logical-assignment/#sec-assignment-operators
      if (nextNext === 61 && surroundingAgent.feature('LogicalAssignment')) { // ||= or &&=
        return this.finishOp(acorn.tokTypes.assign, 3);
      }
      return this.finishOp(code === 124
        ? acorn.tokTypes.logicalOR
        : acorn.tokTypes.logicalAND, 2);
    }
    if (next === 61) { // |= or &=
      return this.finishOp(acorn.tokTypes.assign, 2);
    }
    return this.finishOp(code === 124
      ? acorn.tokTypes.bitwiseOR
      : acorn.tokTypes.bitwiseAND, 1);
  }

  parseStatement(context, topLevel, exports) {
    if (this.type === acorn.tokTypes._import) { // eslint-disable-line no-underscore-dangle
      skipWhiteSpace.lastIndex = this.pos;
      const skip = skipWhiteSpace.exec(this.input);
      const next = this.pos + skip[0].length;
      const nextCh = this.input.charCodeAt(next);
      if (nextCh === 40 || nextCh === 46) { // '(' '.'
        const node = this.startNode();
        return this.parseExpressionStatement(node, this.parseExpression());
      }
    }
    return super.parseStatement(context, topLevel, exports);
  }

  parseExprImport() {
    const node = this.startNode();
    const meta = this.parseIdent(true);
    switch (this.type) {
      case acorn.tokTypes.parenL:
        return this.parseDynamicImport(node);
      case acorn.tokTypes.dot:
        if (!(this.inModule || this.allowImportExportAnywhere)) {
          return this.unexpected();
        }
        this.next();
        node.meta = meta;
        node.property = this.parseIdent(true);
        if (node.property.name !== 'meta' || this.containsEsc) {
          return this.unexpected();
        }
        return this.finishNode(node, 'MetaProperty');
      default:
        return this.unexpected();
    }
  }

  parseSubscripts(base, startPos, startLoc, noCalls) {
    if (noCalls) {
      return super.parseSubscripts(base, startPos, startLoc, noCalls);
    }

    const maybeAsyncArrow = base.type === 'Identifier'
      && base.name === 'async'
      && this.lastTokEnd === base.end
      && !this.canInsertSemicolon()
      && this.input.slice(base.start, base.end) === 'async';

    /**
     * Optional chains are hard okay?
     *
     *  a.b?.c
     *  @=>
     *  OptionalExpression a.b?.c
     *      MemberExpression a.b
     *      OptionalChain ?.c
     *
     *  a.b?.c.d.e
     *  @=>
     *  OptionalExpression a.b?.c.d.e
     *      MemberExpression a.b
     *      OptionalChain ?.c.d.e
     *          OptionalChain ?.c.d
     *              OptionalChain ?.c
     *              Identifier .d
     *          Identifier .e
     *
     *  a.b?.c.d
     *  @=>
     *  OptionalExpression a.b?.c.d
     *      MemberExpression a.b
     *      OptionalChain ?.c.d
     *          OptionalChain ?.c
     *          Identifier .d
     *
     *  a.b?.c.d?.e.f
     *  @=>
     *  OptionalExpression a.b?.c.d?.e.f
     *      OptionalExpression a.b?.c.d
     *          MemberExpression a.b
     *          OptionalChain ?.c.d
     *              OptionalChain ?.c
     *              Identifier .d
     *      OptionalChain ?.e.f
     *          OptionalChain ?.e
     *          Identifier .f
     */

    while (true) {
      if (this.eat(optionalChainToken)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.object = base;
        node.chain = this.parseOptionalChain(startPos, startLoc);
        base = this.finishNode(node, 'OptionalExpression');
      } else {
        const element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow);
        if (element === base) {
          break;
        }
        base = element;
      }
    }
    return base;
  }

  parseOptionalChain(startPos, startLoc) {
    let base = this.startNodeAt(startPos, startLoc);
    if (this.eat(acorn.tokTypes.bracketL)) {
      base.property = this.parseExpression();
      this.expect(acorn.tokTypes.bracketR);
      base.computed = true;
      base = this.finishNode(base, 'OptionalChain');
    } else if (this.eat(acorn.tokTypes.parenL)) {
      base.arguments = this.parseExprList(acorn.tokTypes.parenR, this.options.ecmaVersion >= 8, false, undefined);
    } else {
      base.property = this.parseIdent(true);
      base.computed = false;
    }
    base.base = null;
    base = this.finishNode(base, 'OptionalChain');

    while (true) {
      const computed = this.eat(acorn.tokTypes.bracketL);
      if (computed || this.eat(acorn.tokTypes.dot)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.base = base;
        node.property = computed ? this.parseExpression() : this.parseIdent(true);
        if (computed) {
          this.expect(acorn.tokTypes.bracketR);
        }
        node.computed = computed;
        base = this.finishNode(node, 'OptionalChain');
      } else if (this.eat(acorn.tokTypes.parenL)) {
        const node = this.startNodeAt(startPos, startLoc);
        node.base = base;
        node.arguments = this.parseExprList(acorn.tokTypes.parenR, this.options.ecmaVersion >= 8, false, undefined);
        base = this.finishNode(node, 'OptionalChain');
      } else if (this.eat(acorn.tokTypes.backQuote)) {
        this.raise(this.start, 'Cannot tag an optional chain');
      } else {
        break;
      }
    }

    return base;
  }

  buildBinary(startPos, startLoc, left, right, op, logical) {
    if (op === '??') {
      if (left.type === 'LogicalExpression') {
        this.raise(left.start, 'Cannot mix &&, ||, and ??');
      }
      if (right.type === 'LogicalExpression') {
        this.raise(right.start, 'Cannot mix &&, ||, and ??');
      }
    } else if (logical) {
      if (left.operator === '??') {
        this.raise(left.start, 'Cannot mix &&, ||, and ??');
      }
      if (right.operator === '??') {
        this.raise(right.start, 'Cannot mix &&, ||, and ??');
      }
    }
    return super.buildBinary(startPos, startLoc, left, right, op, logical);
  }

  parseAwait(...args) {
    const node = super.parseAwait(...args);
    if (!this.inFunction) {
      this.containsTopLevelAwait = true;
    }
    return node;
  }

  // Adapted from several different places in Acorn.
  static parseFunctionBody(sourceText, async, generator) {
    const parser = new Parser({
      sourceType: 'script',
    }, sourceText);

    // Parser.prototype.parse()
    const node = parser.startNode();
    parser.nextToken();

    // Parser.prototype.parseFunction()
    parser.initFunction(node);
    parser.enterScope(functionFlags(async, generator));

    // Parser.prototype.parseBlock()
    const body = [];
    while (!parser.eat(acorn.tokTypes.eof)) {
      const stmt = parser.parseStatement(null);
      body.push(stmt);
    }

    // Parser.prototype.parseFunctionBody()
    parser.adaptDirectivePrologue(body);

    deepFreeze(body);

    return body;
  }

  // Acorn's RegExp parser is extended to create an interpretable AST.
  // Some methods have to be entirely rewritten.
  regexp_pattern(state) {
    const Pattern = {
      type: 'Pattern',
      Disjunction: {
        type: 'Disjunction',
        Alternatives: [],
      },
    };
    state.Pattern = Pattern;
    state.capturingParens = [];
    state.groupSpecifiers = new Map();
    state.Disjunction = Pattern.Disjunction;
    state.Disjunctions = [];
    state.Alternatives = [];
    return super.regexp_pattern(state);
  }

  regexp_disjunction(state) {
    const Disjunction = state.Disjunction;
    state.Disjunctions.unshift(Disjunction);
    const ret = super.regexp_disjunction(state);
    state.Disjunctions.shift();
    return ret;
  }

  regexp_alternative(state) {
    const Alternative = {
      type: 'Alternative',
      Terms: [],
    };
    state.Disjunctions[0].Alternatives.push(Alternative);
    state.Alternatives.unshift(Alternative);
    const ret = super.regexp_alternative(state);
    state.Alternatives.shift();
    return ret;
  }

  regexp_eatTerm(state) {
    const Term = {
      type: 'Term',
    };
    const Alternative = state.Alternatives[0];

    const assertion = this.regexp_eatAssertion(state);
    if (assertion) {
      Term.subtype = 'Assertion';
      Term.Assertion = assertion;
      Alternative.Terms.push(Term);
      return true;
    }

    const capturingParensBefore = state.capturingParens.length;
    const atom = this.regexp_eatAtom(state);
    if (atom) {
      Term.subtype = 'Atom';
      Term.Atom = atom;
      Term.capturingParensBefore = capturingParensBefore;
      const quantifier = this.regexp_eatQuantifier(state);
      if (quantifier) {
        Term.subtype = 'AtomQuantifier';
        Term.Quantifier = quantifier;
      }
      Alternative.Terms.push(Term);
      return true;
    }

    return false;
  }

  regexp_eatAssertion(state) {
    const start = state.pos;

    // ^
    if (state.eat(0x5E /* ^ */)) {
      return {
        type: 'Assertion',
        subtype: '^',
      };
    }

    // $
    if (state.eat(0x24 /* $ */)) {
      return {
        type: 'Assertion',
        subtype: '$',
      };
    }

    // \b \B
    if (state.eat(0x5C /* \ */)) {
      if (state.eat(0x62 /* b */)) {
        return {
          type: 'Assertion',
          subtype: '\\b',
        };
      }
      if (state.eat(0x42 /* B */)) {
        return {
          type: 'Assertion',
          subtype: '\\B',
        };
      }
      state.pos = start;
    }

    // Lookahead / Lookbehind
    if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
      let lookbehind = false;
      if (this.options.ecmaVersion >= 9) {
        lookbehind = state.eat(0x3C /* < */);
      }
      let eaten = false;
      let Assertion;
      if (state.eat(0x3D /* = */)) {
        eaten = true;
        Assertion = {
          type: 'Assertion',
          subtype: lookbehind ? '(?<=' : '(?=',
        };
      } else if (state.eat(0x21 /* ! */)) {
        eaten = true;
        Assertion = {
          type: 'Assertion',
          subtype: lookbehind ? '(?<!' : '(?!',
        };
      }
      if (eaten) {
        const Disjunction = {
          type: 'Disjunction',
          Alternatives: [],
        };
        Assertion.Disjunction = Disjunction;
        state.Disjunction = Disjunction;
        this.regexp_disjunction(state);
        if (!state.eat(0x29 /* ) */)) {
          state.raise('Unterminated group');
        }
        return Assertion;
      }
    }

    state.pos = start;
    return false;
  }

  regexp_eatAtom(state) {
    if (this.regexp_eatPatternCharacter(state)) {
      return state.Atom;
    }

    if (state.eat(0x2E /* . */)) {
      return {
        type: 'Atom',
        subtype: '.',
      };
    }

    if (this.regexp_eatReverseSolidusAtomEscape(state)) {
      return {
        type: 'Atom',
        subtype: '\\',
        AtomEscape: state.AtomEscape,
      };
    }

    if (this.regexp_eatCharacterClass(state)) {
      return {
        type: 'Atom',
        subtype: 'CharacterClass',
        CharacterClass: state.CharacterClass,
      };
    }

    const uncapturing = this.regexp_eatUncapturingGroup(state);
    if (uncapturing) {
      return uncapturing;
    }

    const capturing = this.regexp_eatCapturingGroup(state);
    if (capturing) {
      return capturing;
    }

    return false;
  }

  regexp_eatQuantifier(state, noError = false) {
    const QuantifierPrefix = this.regexp_eatQuantifierPrefix(state, noError);
    if (QuantifierPrefix) {
      const greedy = !state.eat(0x3F /* ? */);
      return {
        type: 'Quantifier',
        QuantifierPrefix,
        greedy,
      };
    }
    return false;
  }

  regexp_eatQuantifierPrefix(state, noError) {
    if (state.eat(0x2A /* * */)) {
      return {
        type: 'QuantifierPrefix',
        subtype: '*',
      };
    }

    if (state.eat(0x2B /* + */)) {
      return {
        type: 'QuantifierPrefix',
        subtype: '+',
      };
    }

    if (state.eat(0x3F /* ? */)) {
      return {
        type: 'QuantifierPrefix',
        subtype: '?',
      };
    }

    return this.regexp_eatBracedQuantifier(state, noError);
  }

  regexp_eatBracedQuantifier(state, noError) {
    const start = state.pos;
    if (state.eat(0x7B /* { */)) {
      let min = 0;
      let max = -1;
      if (this.regexp_eatDecimalDigits(state)) {
        min = state.lastIntValue;
        if (state.eat(0x2C /* , */)) {
          if (this.regexp_eatDecimalDigits(state)) {
            max = state.lastIntValue;
          } else {
            max = Infinity;
          }
        }
        if (state.eat(0x7D /* } */)) {
          // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
          if (max !== -1 && max < min && !noError) {
            state.raise('numbers out of order in {} quantifier');
          }
          if (max === -1) {
            return {
              type: 'QuantifierPrefix',
              subtype: 'fixed',
              value: min,
            };
          }
          if (max === Infinity) {
            return {
              type: 'QuantifierPrefix',
              subtype: 'start',
              start: min,
            };
          }
          return {
            type: 'QuantifierPrefix',
            subtype: 'range',
            start: min,
            end: max,
          };
        }
      }
      if (state.switchU && !noError) {
        state.raise('Incomplete quantifier');
      }
      state.pos = start;
    }
    return false;
  }

  regexp_eatUncapturingGroup(state) {
    const start = state.pos;
    if (state.eat(0x28 /* ( */)) {
      if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
        const Disjunction = {
          type: 'Disjunction',
          Alternatives: [],
        };
        state.Disjunction = Disjunction;
        this.regexp_disjunction(state);
        if (state.eat(0x29 /* ) */)) {
          return {
            type: 'Atom',
            subtype: '(?:',
            Disjunction,
          };
        }
        state.raise('Unterminated group');
      }
      state.pos = start;
    }
    return false;
  }

  regexp_eatCapturingGroup(state) {
    if (state.eat(0x28 /* ( */)) {
      const result = {
        type: 'Atom',
        subtype: '(',
        capturingParensBefore: state.capturingParens.length,
        Disjunction: {
          type: 'Disjunction',
          Alternatives: [],
        },
      };
      state.capturingParens.push(result);
      if (this.options.ecmaVersion >= 9) {
        this.regexp_groupSpecifier(state);
        result.GroupSpecifier = state.lastStringValue;
        if (result.GroupSpecifier) {
          state.groupSpecifiers.set(result.GroupSpecifier, state.capturingParens.length);
        }
      } else if (state.current() === 0x3F /* ? */) {
        state.raise('Invalid group');
      }
      const numCapturingParens = state.capturingParens.length;
      state.Disjunction = result.Disjunction;
      this.regexp_disjunction(state);
      if (state.eat(0x29 /* ) */)) {
        result.enclosedCapturingParens = state.capturingParens.length - numCapturingParens;
        state.numCapturingParens += 1;
        if (state.numCapturingParens >= 2 ** 32 - 1) {
          state.raise('Too many capturing parens');
        }
        return result;
      }
      state.raise('Unterminated group');
    }
    return false;
  }

  regexp_eatPatternCharacter(state) {
    // Like regexp_eatPatternCharacters, but is not eager.
    const ch = state.current();
    if (!isSyntaxCharacter(ch)) {
      state.Atom = {
        type: 'Atom',
        subtype: 'PatternCharacter',
        PatternCharacter: ch,
      };
      state.advance();
      return true;
    }
    return false;
  }

  regexp_eatAtomEscape(state) {
    if (this.regexp_eatBackReference(state)) {
      state.AtomEscape = {
        type: 'AtomEscape',
        subtype: 'DecimalEscape',
        DecimalEscape: state.DecimalEscape,
      };
      return true;
    }
    if (this.regexp_eatCharacterClassEscape(state)) {
      state.AtomEscape = {
        type: 'AtomEscape',
        subtype: 'CharacterClassEscape',
        CharacterClassEscape: state.CharacterClassEscape,
      };
      return true;
    }
    if (this.regexp_eatCharacterEscape(state)) {
      state.AtomEscape = {
        type: 'AtomEscape',
        subtype: 'CharacterEscape',
        CharacterEscape: state.CharacterEscape,
      };
      return true;
    }
    if (state.switchN && this.regexp_eatKGroupName(state)) {
      state.AtomEscape = {
        type: 'AtomEscape',
        subtype: 'k',
        GroupName: state.backReferenceNames[state.backReferenceNames.length - 1],
      };
      return true;
    }
    if (state.switchU) {
      // Make the same message as V8.
      if (state.current() === 0x63 /* c */) {
        state.raise('Invalid unicode escape');
      }
      state.raise('Invalid escape');
    }
    return false;
  }

  regexp_eatBackReference(state) {
    if (this.regexp_eatDecimalEscape(state)) {
      const n = state.lastIntValue;
      if (n > state.maxBackReference) {
        state.maxBackReference = n;
      }
      return true;
    }
    return false;
  }

  regexp_eatDecimalEscape(state) {
    const ret = super.regexp_eatDecimalEscape(state);
    if (ret) {
      state.DecimalEscape = {
        type: 'DecimalEscape',
        CapturingGroupNumber: state.lastIntValue,
      };
    }
    return ret;
  }

  regexp_eatCharacterClassEscape(state) {
    const ch = state.current();

    if (isCharacterClassEscape(ch)) {
      state.lastIntValue = -1;
      state.advance();
      state.CharacterClassEscape = {
        type: 'CharacterClassEscape',
        subtype: String.fromCharCode(ch),
      };
      return true;
    }

    if (
      state.switchU
      && this.options.ecmaVersion >= 9
      && (ch === 0x50 /* P */ || ch === 0x70 /* p */)
    ) {
      state.lastIntValue = -1;
      state.advance();
      if (
        state.eat(0x7B /* { */)
        && this.regexp_eatUnicodePropertyValueExpression(state)
        && state.eat(0x7D /* } */)
      ) {
        state.CharacterClassEscape = {
          type: 'CharacterClassEscape',
          subtype: ch === 0x50 ? 'P{' : 'p{',
          UnicodePropertyValueExpression: state.UnicodePropertyValueExpression,
        };
        return true;
      }
      state.raise('Invalid property name');
    }

    return false;
  }

  regexp_validateUnicodePropertyNameAndValue(state, name, value) {
    state.UnicodePropertyValueExpression = {
      type: 'UnicodePropertyValueExpression',
      subtype: 'UnicodePropertyNameAndValue',
      UnicodePropertyName: name,
      UnicodePropertyValue: value,
    };
    return super.regexp_validateUnicodePropertyNameAndValue(state, name, value);
  }

  regexp_validateUnicodePropertyNameOrValue(state, nameOrValue) {
    state.UnicodePropertyValueExpression = {
      type: 'UnicodePropertyValueExpression',
      subtype: 'LoneUnicodePropertyNameOrValue',
      LoneUnicodePropertyNameOrValue: nameOrValue,
    };
    return super.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
  }

  regexp_eatCharacterEscape(state) {
    if (
      this.regexp_eatControlEscape(state)
      || this.regexp_eatCControlLetter(state)
      || this.regexp_eatZero(state)
      || this.regexp_eatHexEscapeSequence(state)
      || this.regexp_eatRegExpUnicodeEscapeSequence(state)
      || this.regexp_eatIdentityEscape(state)
    ) {
      state.CharacterEscape = {
        type: 'CharacterEscape',
        CharacterValue: state.lastIntValue,
      };
      return true;
    }
    return false;
  }

  regexp_eatCharacterClass(state) {
    if (state.eat(0x5B /* [ */)) {
      state.CharacterClass = {
        type: 'CharacterClass',
        invert: false,
        ClassRanges: [],
      };
      if (state.eat(0x5E /* ^ */)) {
        state.CharacterClass.invert = true;
      }
      this.regexp_classRanges(state);
      if (state.eat(0x5D /* ] */)) {
        return true;
      }
      // Unreachable since it threw "unterminated regular expression" error before.
      state.raise('Unterminated character class');
    }
    return false;
  }

  regexp_classRanges(state) {
    while (this.regexp_eatClassAtom(state)) {
      const left = state.lastIntValue;
      const leftClassAtom = state.ClassAtom;
      if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
        const right = state.lastIntValue;
        if (state.switchU && (left === -1 || right === -1)) {
          state.raise('Invalid character class');
        }
        if (left !== -1 && right !== -1 && left > right) {
          state.raise('Range out of order in character class');
        }
        state.CharacterClass.ClassRanges.push([leftClassAtom, state.ClassAtom]);
      } else {
        state.CharacterClass.ClassRanges.push(leftClassAtom);
      }
    }
  }

  regexp_eatClassAtom(state) {
    const start = state.pos;

    if (state.eat(0x5C /* \ */)) {
      if (this.regexp_eatClassEscape(state)) {
        state.ClassAtom = {
          type: 'ClassAtom',
          subtype: 'ClassEscape',
          ClassEscape: state.ClassEscape,
        };
        return true;
      }
      if (state.switchU) {
        // Make the same message as V8.
        const ch = state.current();
        if (ch === 0x63 /* c */ || isOctalDigit(ch)) {
          state.raise('Invalid class escape');
        }
        state.raise('Invalid escape');
      }
      state.pos = start;
    }

    const ch = state.current();
    if (ch !== 0x5D /* ] */) {
      state.lastIntValue = ch;
      state.advance();
      state.ClassAtom = {
        type: 'ClassAtom',
        subtype: 'character',
        character: ch,
      };
      return true;
    }

    return false;
  }

  regexp_eatClassEscape(state) {
    if (state.eat(0x62 /* b */)) {
      state.lastIntValue = 0x08; /* <BS> */
      state.ClassEscape = {
        type: 'ClassEscape',
        subtype: 'b',
      };
      return true;
    }

    if (state.switchU && state.eat(0x2D /* - */)) {
      state.lastIntValue = 0x2D; /* - */
      state.ClassEscape = {
        type: 'ClassEscape',
        subtype: '-',
      };
      return true;
    }

    if (this.regexp_eatCharacterClassEscape(state)) {
      state.ClassEscape = {
        type: 'ClassEscape',
        subtype: 'CharacterClassEscape',
        CharacterClassEscape: state.CharacterClassEscape,
      };
      return true;
    }

    if (this.regexp_eatCharacterEscape(state)) {
      state.ClassEscape = {
        type: 'ClassEscape',
        subtype: 'CharacterEscape',
        CharacterEscape: state.CharacterEscape,
      };
      return true;
    }

    return false;
  }
}));

export function ParseAsFunctionBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, false, false);
}

export function ParseAsGeneratorBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, false, true);
}

export function ParseAsAsyncFunctionBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, true, false);
}

export function ParseAsAsyncGeneratorBody(sourceText) {
  return Parser.parseFunctionBody(sourceText, true, true);
}

// Adapted from several different places in Acorn.
// `strict` refers to ContainsUseStrict of the corresponding function body.
export function ParseAsFormalParameters(sourceText, strict, enableAwait, enableYield) {
  // Adapted from different places in Acorn.
  const parser = new Parser({
    sourceType: 'script',
  }, sourceText);

  parser.strict = strict;

  // Parser.prototype.parse()
  const node = parser.startNode();
  parser.nextToken();

  // Parser.prototype.parseFunction()
  parser.initFunction(node);
  parser.enterScope(functionFlags(enableAwait, enableYield));

  // Parser.prototype.parseFunctionParams()
  const params = parser.parseBindingList(acorn.tokTypes.eof, false, true);
  parser.checkYieldAwaitInDefaultParams();

  // Parser.prototype.parseFunctionBody()
  const simple = parser.isSimpleParamList(params);
  if (strict && !simple) {
    parser.raiseRecoverable(node.start, 'Illegal \'use strict\' directive in function with non-simple parameter list');
  }
  parser.checkParams({ params }, !strict && simple);

  deepFreeze(params);

  return params;
}

export const emptyConstructorNode = Parser.parse('(class { constructor() {} })').body[0].expression.expression.body.body[0];
export const forwardingConstructorNode = Parser.parse('(class extends X { constructor(...args) { super(...args); } })').body[0].expression.expression.body.body[0];

function forwardError(fn) {
  try {
    return fn();
  } catch (e) {
    if (e.name === 'SyntaxError') {
      return [surroundingAgent.Throw('SyntaxError', 'Raw', e.message).Value];
    } else {
      throw e;
    }
  }
}

export function ParseScript(sourceText, realm, hostDefined = {}, strict) {
  const body = forwardError(() => Parser.parse(sourceText, {
    sourceType: 'script',
    strict,
  }));
  if (Array.isArray(body)) {
    return body;
  }

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
    mark(m) {
      m(this.Realm);
      m(this.Environment);
    },
  };
}

export function ParseModule(sourceText, realm, hostDefined = {}) {
  // Assert: sourceText is an ECMAScript source text (see clause 10).
  const body = forwardError(() => Parser.parse(sourceText, {
    sourceType: 'module',
    allowAwaitOutsideFunction: surroundingAgent.feature('TopLevelAwait'),
  }));
  if (Array.isArray(body)) {
    return body;
  }

  const requestedModules = ModuleRequests_ModuleItemList(body.body);
  const importEntries = ImportEntries_ModuleItemList(body.body);
  const importedBoundNames = new ValueSet(ImportedLocalNames(importEntries));
  const indirectExportEntries = [];
  const localExportEntries = [];
  const starExportEntries = [];
  const exportEntries = ExportEntries_ModuleItemList(body.body);
  for (const ee of exportEntries) {
    if (ee.ModuleRequest === Value.null) {
      if (!importedBoundNames.has(ee.LocalName)) {
        localExportEntries.push(ee);
      } else {
        const ie = importEntries.find((e) => e.LocalName.stringValue() === ee.LocalName.stringValue());
        if (ie.ImportName.stringValue() === '*') {
          // Assert: This is a re-export of an imported module namespace object.
          localExportEntries.push(ee);
        } else {
          indirectExportEntries.push(new ExportEntryRecord({
            ModuleRequest: ie.ModuleRequest,
            ImportName: ie.ImportName,
            LocalName: Value.null,
            ExportName: ee.ExportName,
          }));
        }
      }
    } else if (ee.ImportName.stringValue() === '*') {
      starExportEntries.push(ee);
    } else {
      indirectExportEntries.push(ee);
    }
  }

  return new SourceTextModuleRecord({
    Realm: realm,
    Environment: Value.undefined,
    Namespace: Value.undefined,
    ImportMeta: undefined,
    Async: body.containsTopLevelAwait ? Value.true : Value.false,
    AsyncEvaluating: Value.false,
    TopLevelCapability: Value.undefined,
    AsyncParentModules: Value.undefined,
    PendingAsyncDependencies: Value.undefined,
    Status: 'unlinked',
    EvaluationError: Value.undefined,
    HostDefined: hostDefined,
    ECMAScriptCode: body,
    Context: undefined,
    RequestedModules: requestedModules,
    ImportEntries: importEntries,
    LocalExportEntries: localExportEntries,
    IndirectExportEntries: indirectExportEntries,
    StarExportEntries: starExportEntries,
    DFSIndex: Value.undefined,
    DFSAncestorIndex: Value.undefined,
  });
}

export function ParseRegExp(source, flags) {
  const parser = new Parser({
    sourceType: 'script',
  }, 'a/');

  // Initialize RegExp state.
  parser.readRegexp();

  let escaped = false;
  let inClass = false;
  let pos = 0;
  for (;;) {
    if (pos >= source.length) {
      if (inClass || escaped) {
        parser.raise(0, 'Unterminated regular expression');
      } else {
        break;
      }
    }
    const ch = source.charAt(pos);
    if (!escaped) {
      if (ch === '[') {
        inClass = true;
      } else if (ch === ']' && inClass) {
        inClass = false;
      }
      escaped = ch === '\\';
    } else {
      escaped = false;
    }
    pos += 1;
  }

  const state = parser.regexpState;
  state.reset(0, source, flags);

  parser.validateRegExpPattern(state);

  return {
    pattern: state.Pattern,
    capturingParens: state.capturingParens,
    groupSpecifiers: state.groupSpecifiers,
  };
}
