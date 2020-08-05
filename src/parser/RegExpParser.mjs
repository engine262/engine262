import {
  BinaryUnicodeProperties,
  NonbinaryUnicodeProperties,
  UnicodeGeneralCategoryValues,
  UnicodeScriptValues,
} from '../runtime-semantics/all.mjs';
import { CharacterValue } from '../static-semantics/all.mjs';
import {
  isIdentifierStart,
  isIdentifierContinue,
  isHexDigit,
} from './Lexer.mjs';

const isSyntaxCharacter = (c) => '^$.*+?()[]{}|'.includes(c);
const isClosingSyntaxCharacter = (c) => ')]}|'.includes(c);
const isDecimalDigit = (c) => /[0123456789]/u.test(c);
const isControlLetter = (c) => /[a-zA-Z]/u.test(c);

export class RegExpParser {
  constructor(source, plusU) {
    this.source = source;
    this.position = 0;
    this.plusU = plusU;
    this.capturingGroups = [];
    this.groupSpecifiers = new Map();
  }

  peek() {
    return this.source[this.position];
  }

  test(c) {
    return this.source[this.position] === c;
  }

  eat(c) {
    if (this.test(c)) {
      this.next();
      return true;
    }
    return false;
  }

  next() {
    const c = this.source[this.position];
    this.position += 1;
    return c;
  }

  expect(c) {
    if (!this.eat(c)) {
      throw new SyntaxError(`Expected ${c} but got ${this.peek()}`);
    }
  }

  // Pattern ::
  //   Disjunction
  parsePattern() {
    const node = {
      type: 'Pattern',
      groupSpecifiers: this.groupSpecifiers,
      capturingGroups: this.capturingGroups,
      Disjunction: undefined,
    };
    node.Disjunction = this.parseDisjunction();
    return node;
  }

  // Disjunction ::
  //   Alternative
  //   Alternative `|` Disjunction
  parseDisjunction() {
    const node = {
      type: 'Disjunction',
      Alternative: undefined,
      Disjunction: undefined,
    };
    node.Alternative = this.parseAlternative();
    if (this.eat('|')) {
      node.Disjunction = this.parseDisjunction();
    }
    return node;
  }


  // Alternative ::
  //   [empty]
  //   Term Alternative
  parseAlternative() {
    let node = {
      type: 'Alternative',
      Term: undefined,
      Alternative: undefined,
    };
    while (this.position < this.source.length
           && !isClosingSyntaxCharacter(this.peek())) {
      node = {
        type: 'Alternative',
        Term: this.parseTerm(),
        Alternative: node,
      };
    }
    return node;
  }

  // Term ::
  //   Assertion
  //   Atom
  //   Atom Quantifier
  parseTerm() {
    const assertion = this.maybeParseAssertion();
    if (assertion) {
      return assertion;
    }
    return {
      type: 'Term',
      capturingParenthesesBefore: this.capturingGroups.length,
      Atom: this.parseAtom(),
      Quantifier: this.maybeParseQuantifier(),
    };
  }

  // Assertion ::
  //   `^`
  //   `$`
  //   `\` `b`
  //   `\` `B`
  //   `(` `?` `=` Disjunction `)`
  //   `(` `?` `!` Disjunction `)`
  //   `(` `?` `<=` Disjunction `)`
  //   `(` `?` `<!` Disjunction `)`
  maybeParseAssertion() {
    if (this.eat('^')) {
      return { type: 'Assertion', subtype: '^' };
    }
    if (this.eat('$')) {
      return { type: 'Assertion', subtype: '$' };
    }

    const look2 = this.source.slice(this.position, this.position + 2);
    if (look2 === '\\b') {
      this.position += 2;
      return { type: 'Assertion', subtype: 'b' };
    }
    if (look2 === '\\B') {
      this.position += 2;
      return { type: 'Assertion', subtype: 'B' };
    }

    const look3 = this.source.slice(this.position, this.position + 3);
    if (look3 === '(?=') {
      this.position += 3;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        subtype: '?=',
        Disjunction: d,
      };
    }
    if (look3 === '(?!') {
      this.position += 3;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        subtype: '?!',
        Disjunction: d,
      };
    }

    const look4 = this.source.slice(this.position, this.position + 4);
    if (look4 === '(?<=') {
      this.position += 4;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        subtype: '?<=',
        Disjunction: d,
      };
    }
    if (look4 === '(?<!') {
      this.position += 4;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        subtype: '?<!',
        Disjunction: d,
      };
    }

    return undefined;
  }

  // Quantifier ::
  //   QuantifierPrefix
  //   QuantifierPrefix `?`
  // QuantifierPrefix ::
  //   `*`
  //   `+`
  //   `?`
  //   `{` DecimalDigits `}`
  //   `{` DecimalDigits `,` `}`
  //   `{` DecimalDigits `,` DecimalDigits `}`
  maybeParseQuantifier() {
    let QuantifierPrefix;

    if (this.eat('*')) {
      QuantifierPrefix = '*';
    } else if (this.eat('+')) {
      QuantifierPrefix = '+';
    } else if (this.eat('?')) {
      QuantifierPrefix = '?';
    } else if (this.eat('{')) {
      QuantifierPrefix = {
        DecimalDigits_a: undefined,
        DecimalDigits_b: undefined,
      };
      QuantifierPrefix.DecimalDigits_a = Number.parseInt(this.parseDecimalDigits(), 10);
      if (this.eat(',')) {
        if (!this.test('}')) {
          QuantifierPrefix.DecimalDigits_b = Number.parseInt(this.parseDecimalDigits(), 10);
          if (QuantifierPrefix.DecimalDigits_a > QuantifierPrefix.DecimalDigits_b) {
            throw new SyntaxError('Numbers out of order in {} quantifier');
          }
        }
      }
      this.expect('}');
    }

    if (QuantifierPrefix) {
      return {
        type: 'Quantifier',
        QuantifierPrefix,
        greedy: !this.eat('?'),
      };
    }

    return undefined;
  }

  // Atom ::
  //   PatternCharacter
  //   `.`
  //   `\` AtomEscape
  //   CharacterClass
  //   `(` GroupSpecifier Disjunction `)`
  //   `(` `?` `:` Disjunction `)`
  parseAtom() {
    if (this.eat('.')) {
      return { type: 'Atom', subtype: '.', enclosedCapturingParentheses: 0 };
    }
    if (this.eat('\\')) {
      return this.parseAtomEscape();
    }
    if (this.eat('(')) {
      const node = {
        type: 'Atom',
        capturingParenthesesBefore: this.capturingGroups.length,
        enclosedCapturingParentheses: 0,
        capturing: true,
        GroupSpecifier: undefined,
        Disjunction: undefined,
      };
      if (this.eat('?')) {
        if (this.eat(':')) {
          node.capturing = false;
        } else {
          node.GroupSpecifier = this.parseGroupName();
        }
      }
      if (node.capturing) {
        this.capturingGroups.push(node);
      }
      if (node.GroupSpecifier) {
        this.groupSpecifiers.set(node.GroupSpecifier, node.capturingParenthesesBefore);
      }
      node.Disjunction = this.parseDisjunction();
      this.expect(')');
      node.enclosedCapturingParentheses = this.capturingGroups.length - node.capturingParenthesesBefore - 1;
      return node;
    }
    if (this.test('[')) {
      return {
        type: 'Atom',
        CharacterClass: this.parseCharacterClass(),
      };
    }
    if (isSyntaxCharacter(this.peek())) {
      throw new SyntaxError(`Expected a PatternCharacter but got ${this.peek()}`);
    }
    return {
      type: 'Atom',
      PatternCharacter: this.next(),
    };
  }

  // AtomEscape ::
  //   DecimalEscape
  //   CharacterClassEscape
  //   CharacterEscape
  //   `k` GroupName
  parseAtomEscape() {
    if (this.eat('k')) {
      return {
        type: 'AtomEscape',
        GroupName: this.parseGroupName(),
      };
    }
    const CharacterClassEscape = this.maybeParseCharacterClassEscape();
    if (CharacterClassEscape) {
      return {
        type: 'AtomEscape',
        CharacterClassEscape,
      };
    }
    const DecimalEscape = this.maybeParseDecimalEscape();
    if (DecimalEscape) {
      return {
        type: 'AtomEscape',
        DecimalEscape,
      };
    }
    return {
      type: 'AtomEscape',
      CharacterEscape: this.parseCharacterEscape(),
    };
  }

  // CharacterEscape ::
  //   ControlEscape
  //   `c` ControlLetter
  //   `0` [lookahead ∉ DecimalDigit]
  //   HexEscapeSequence
  //   RegExpUnicodeEscapeSequence
  //   IdentityEscape
  parseCharacterEscape() {
    switch (this.peek()) {
      case 'f':
      case 'n':
      case 'r':
      case 't':
      case 'v':
        return {
          type: 'CharacterEscape',
          ControlEscape: this.next(),
        };
      case 'c': {
        this.next();
        const c = this.next();
        const p = c.codePointAt(0);
        if ((p >= 65 && p <= 90) || (p >= 97 && p <= 122)) {
          return {
            type: 'CharacterEscape',
            ControlLetter: c,
          };
        }
        return {
          type: 'CharacterEscape',
          IdentityEscape: c,
        };
      }
      case 'x':
        if (isHexDigit(this.source[this.position + 1]) && isHexDigit(this.source[this.position + 2])) {
          return {
            type: 'CharacterEscape',
            HexEscapeSequence: this.parseHexEscapeSequence(),
          };
        }
        this.next();
        return {
          type: 'CharacterEscape',
          IdentityEscape: 'x',
        };
      case 'u': {
        const RegExpUnicodeEscapeSequence = this.maybeParseRegExpUnicodeEscapeSequence();
        if (RegExpUnicodeEscapeSequence) {
          return {
            type: 'CharacterEscape',
            RegExpUnicodeEscapeSequence,
          };
        }
        this.next();
        return {
          type: 'CharacterEscape',
          IdentityEscape: 'u',
        };
      }
      default: {
        const c = this.next();
        if (c === '0' && !isDecimalDigit(this.peek())) {
          return {
            type: 'CharacterEscape',
            subtype: '0',
          };
        }
        return {
          type: 'CharacterEscape',
          IdentityEscape: c,
        };
      }
    }
  }

  // DecimalEscape ::
  //   NonZeroDigit DecimalDigits? [lookahead != DecimalDigit]
  maybeParseDecimalEscape() {
    if (isDecimalDigit(this.source[this.position]) && this.source[this.position] !== '0') {
      let buffer = this.source[this.position];
      this.position += 1;
      while (isDecimalDigit(this.source[this.position])) {
        buffer += this.source[this.position];
        this.position += 1;
      }
      return {
        type: 'DecimalEscape',
        value: Number.parseInt(buffer, 10),
      };
    }
    return undefined;
  }

  // CharacterClassEscape ::
  //   `d`
  //   `D`
  //   `s`
  //   `S`
  //   `w`
  //   `W`
  //   [+U] `p{` UnicodePropertyValueExpression `}`
  //   [+U] `P{` UnicodePropertyValueExpression `}`
  maybeParseCharacterClassEscape() {
    switch (this.peek()) {
      case 'd':
      case 'D':
      case 's':
      case 'S':
      case 'w':
      case 'W':
        return {
          type: 'CharacterClassEscape',
          value: this.next(),
        };
      case 'p':
      case 'P': {
        if (!this.plusU) {
          return undefined;
        }
        const value = this.next();
        this.expect('{');
        let sawDigit;
        let LoneUnicodePropertyNameOrValue = '';
        while (true) {
          if (this.position >= this.source.length) {
            throw new SyntaxError('Invalid unicode property name or value');
          }
          const c = this.source[this.position];
          if (isDecimalDigit(c)) {
            sawDigit = true;
            this.position += 1;
            LoneUnicodePropertyNameOrValue += c;
            continue;
          }
          if (c === '_') {
            this.position += 1;
            LoneUnicodePropertyNameOrValue += c;
            continue;
          }
          if (!isControlLetter(c)) {
            break;
          }
          this.position += 1;
          LoneUnicodePropertyNameOrValue += c;
        }
        if (LoneUnicodePropertyNameOrValue.length === 0) {
          throw new SyntaxError('Invalid unicode property name or value');
        }
        if (sawDigit && this.eat('}')) {
          if (!(LoneUnicodePropertyNameOrValue in UnicodeGeneralCategoryValues
              || LoneUnicodePropertyNameOrValue in BinaryUnicodeProperties)) {
            throw new SyntaxError('Invalid unicode property name or value');
          }
          return {
            type: 'CharacterClassEscape',
            value,
            UnicodePropertyValueExpression: {
              type: 'UnicodePropertyValueExpression',
              LoneUnicodePropertyNameOrValue,
            },
          };
        }
        let UnicodePropertyValue;
        if (this.source[this.position] === '=') {
          this.position += 1;
          UnicodePropertyValue = '';
          while (true) {
            if (this.position >= this.source.length) {
              throw new SyntaxError('Invalid unicode property value');
            }
            const c = this.source[this.position];
            if (!isControlLetter(c) && !isDecimalDigit(c) && c !== '_') {
              break;
            }
            this.position += 1;
            UnicodePropertyValue += c;
          }
          if (UnicodePropertyValue.length === 0) {
            throw new SyntaxError('Invalid unicode property value');
          }
        }
        this.expect('}');
        if (UnicodePropertyValue) {
          if (!(LoneUnicodePropertyNameOrValue in NonbinaryUnicodeProperties)) {
            throw new SyntaxError('Invalid unicode property name');
          }
          if (!(UnicodePropertyValue in UnicodeGeneralCategoryValues || UnicodePropertyValue in UnicodeScriptValues)) {
            throw new SyntaxError('Invalid unicode property value');
          }
          return {
            type: 'CharacterClassEscape',
            value,
            UnicodePropertyValueExpression: {
              type: 'UnicodePropertyValueExpression',
              UnicodePropertyName: LoneUnicodePropertyNameOrValue,
              UnicodePropertyValue,
            },
          };
        }
        if (!(LoneUnicodePropertyNameOrValue in UnicodeGeneralCategoryValues
            || LoneUnicodePropertyNameOrValue in BinaryUnicodeProperties)) {
          throw new SyntaxError('Invalid unicode property name or value');
        }
        return {
          type: 'CharacterClassEscape',
          value,
          UnicodePropertyValueExpression: {
            type: 'UnicodePropertyValueExpression',
            LoneUnicodePropertyNameOrValue,
          },
        };
      }
      default:
        return undefined;
    }
  }

  // CharacterClass ::
  //   `[` ClassRanges `]`
  //   `[` `^` ClassRanges `]`
  parseCharacterClass() {
    this.expect('[');
    const node = {
      type: 'CharacterClass',
      invert: false,
      ClassRanges: undefined,
    };
    node.invert = this.eat('^');
    node.ClassRanges = this.parseClassRanges();
    this.expect(']');
    return node;
  }

  // ClassRanges ::
  //   [empty]
  //   NonemptyClassRanges
  parseClassRanges() {
    const ranges = [];
    while (!this.test(']')) {
      if (this.position >= this.source.length) {
        throw new SyntaxError('Unexpected end of CharacterClass');
      }
      const atom = this.parseClassAtom();
      if (atom.type !== 'CharacterClassEscape' && this.eat('-')) {
        const atom2 = this.parseClassAtom();
        if (atom2.type === 'CharacterClassEscape') {
          ranges.push(atom);
          ranges.push({ type: 'ClassAtom', value: '-' });
          ranges.push(atom2);
        } else {
          if (CharacterValue(atom) > CharacterValue(atom2)) {
            throw new SyntaxError('Invalid class range');
          }
          ranges.push([atom, atom2]);
        }
      } else {
        ranges.push(atom);
      }
    }
    return ranges;
  }

  // ClassAtom ::
  //   `-`
  //   ClassAtomNoDash
  // ClassAtomNoDash ::
  //   SourceCharacter but not one of `\` or `]` or `-`
  //   `\` ClassEscape
  // ClassEscape :
  //   `b`
  //   [+U] `-`
  //   CharacterClassEscape
  //   CharacterEscape
  parseClassAtom() {
    if (this.eat('\\')) {
      if (this.eat('b')) {
        return {
          type: 'ClassEscape',
          value: 'b',
        };
      }
      if (this.eat('-')) {
        return {
          type: 'ClassEscape',
          value: '-',
        };
      }
      const CharacterClassEscape = this.maybeParseCharacterClassEscape();
      if (CharacterClassEscape) {
        return CharacterClassEscape;
      }
      return {
        type: 'ClassEscape',
        CharacterEscape: this.parseCharacterEscape(),
      };
    }
    return {
      type: 'ClassAtom',
      SourceCharacter: this.next(),
    };
  }

  parseGroupName() {
    this.expect('<');
    const RegExpIdentifierName = this.parseIdentifierName();
    this.expect('>');
    return RegExpIdentifierName;
  }

  // RegExpIdentifierName ::
  //   RegExpIdentifierStart
  //   RegExpIdentifierName RegExpIdentifierPart
  parseIdentifierName() {
    let name = '';
    while (true) {
      const c = this.peek();
      if (isIdentifierStart(c) || isIdentifierContinue(c) || c === '$') {
        name += this.next();
      } else {
        break;
      }
    }
    return name;
  }

  // DecimalDigits ::
  //   DecimalDigit
  //   DecimalDigits DecimalDigit
  parseDecimalDigits() {
    let n = '';
    while (isDecimalDigit(this.peek())) {
      n += this.next();
    }
    return n;
  }

  // HexEscapeSequence ::
  //   `x` HexDigit HexDigit
  parseHexEscapeSequence() {
    this.expect('x');
    const HexDigit_a = this.next();
    if (!isHexDigit(HexDigit_a)) {
      throw new SyntaxError('Not a hex digit');
    }
    const HexDigit_b = this.next();
    if (!isHexDigit(HexDigit_b)) {
      throw new SyntaxError('Not a hex digit');
    }
    return {
      type: 'HexEscapeSequence',
      HexDigit_a,
      HexDigit_b,
    };
  }

  // RegExpUnicodeEscapeSequence ::
  //   `u` HexLeadSurrogate `\u` HexTrailSurrogate
  //   `u` HexLeadSurrogate
  //   `u` HexTrailSurrogate
  //   `u` HexNonSurrogate
  //   `u` Hex4Digits
  //   `u{` CodePoint `}`
  maybeParseRegExpUnicodeEscapeSequence() {
    const start = this.position;
    if (!this.eat('u')) {
      this.position = start;
      return undefined;
    }
    if (this.test('{')) {
      let buffer = '';
      while (!this.eat('}')) {
        if (this.position >= this.source.length) {
          this.position = start;
          return undefined;
        }
        if (!isHexDigit(this.source[this.position])) {
          this.position = start;
          return undefined;
        }
        buffer += this.next();
      }
      this.expect('}');
      const CodePoint = Number.parseInt(buffer, 16);
      if (CodePoint > 0x10FFFF) {
        this.position = start;
        return undefined;
      }
      return {
        type: 'RegExpUnicodeEscapeSequence',
        CodePoint,
      };
    }
    const digits = [];
    for (let i = 0; i < 4; i += 1) {
      const HexDigit = this.next();
      if (!isHexDigit(HexDigit)) {
        this.position = start;
        return undefined;
      }
      digits.push(HexDigit);
    }
    return {
      type: 'RegExpUnicodeEscapeSequence',
      Hex4Digits: {
        HexDigit_a: digits[0],
        HexDigit_b: digits[1],
        HexDigit_c: digits[2],
        HexDigit_d: digits[3],
      },
    };
  }
}
