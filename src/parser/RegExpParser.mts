import {
  BinaryUnicodeProperties,
  NonbinaryUnicodeProperties,
  UnicodeGeneralCategoryValues,
  UnicodeScriptValues,
} from '../runtime-semantics/all.mjs';
import {
  CharacterValue,
  UTF16SurrogatePairToCodePoint,
} from '../static-semantics/all.mjs';
import {
  isIdentifierStart,
  isIdentifierPart,
  isLeadingSurrogate,
  isTrailingSurrogate,
  isHexDigit,
  isRegularExpressionFlagPart,
} from './Lexer.mjs';
import type { ParseNode } from './ParseNode.mjs';

const isSyntaxCharacter = (c: string) => '^$\\.*+?()[]{}|'.includes(c);
const isClosingSyntaxCharacter = (c: string) => ')]}|'.includes(c);
const isDecimalDigit = (c: string) => /[0123456789]/u.test(c);
const isControlLetter = (c: string) => /[a-zA-Z]/u.test(c);
const isIdentifierContinue = (c: string) => c && /\p{ID_Continue}/u.test(c);

enum ParserContext {
  None = 0,
  U = 1 << 0,
  N = 1 << 1,
}

export interface RegExpParserContext { U?: undefined | boolean; N?: undefined | boolean; }
export class RegExpParser {
  private source: string;
  private position = 0;
  private capturingGroups: ParseNode.RegExp.Atom_Group[] = [];
  private groupSpecifiers = new Map<string, number>();
  private decimalEscapes: {readonly value: number, readonly position: number}[] = [];
  private groupNameRefs: ParseNode.RegExp.AtomEscape[] = [];
  private state = ParserContext.None;
  constructor(source: string) {
    this.source = source;
  }

  scope<T>(flags: RegExpParserContext, f: () => T): T {
    const oldState = this.state;

    if (flags.U === true) {
      this.state |= ParserContext.U;
    } else if (flags.U === false) {
      this.state &= ~ParserContext.U;
    }

    if (flags.N === true) {
      this.state |= ParserContext.N;
    } else if (flags.N === false) {
      this.state &= ~ParserContext.N;
    }

    const r = f();

    this.state = oldState;

    return r;
  }

  private get plusU() {
    return (this.state & ParserContext.U) === ParserContext.U;
  }

  private get plusN() {
    return (this.state & ParserContext.N) === ParserContext.N;
  }

  private raise(message: string, position = this.position): never {
    const e = new SyntaxError(message);
    e.position = position;
    throw e;
  }

  private peek() {
    return this.source[this.position];
  }

  private test(c: string) {
    return this.source[this.position] === c;
  }

  private eat(c: string) {
    if (this.test(c)) {
      this.next();
      return true;
    }
    return false;
  }

  private next() {
    const c = this.source[this.position];
    this.position += 1;
    return c;
  }

  private expect(c: string) {
    if (!this.eat(c)) {
      this.raise(`Expected ${c} but got ${this.peek()}`);
    }
  }

  // Pattern ::
  //   Disjunction
  parsePattern() {
    const node: ParseNode.RegExp.Pattern = {
      type: 'Pattern',
      groupSpecifiers: this.groupSpecifiers,
      capturingGroups: this.capturingGroups,
      Disjunction: this.parseDisjunction(),
    };
    if (this.position < this.source.length) {
      this.raise('Unexpected token');
    }
    this.decimalEscapes.forEach((d) => {
      if (d.value > node.capturingGroups.length) {
        this.raise('Invalid decimal escape', d.position);
      }
    });
    this.groupNameRefs.forEach((g) => {
      if (!node.groupSpecifiers.has(g.GroupName!)) {
        this.raise('Invalid group name', g.position);
      }
    });
    return node;
  }

  // Disjunction ::
  //   Alternative
  //   Alternative `|` Disjunction
  private parseDisjunction() {
    const node: ParseNode.RegExp.Mutable<ParseNode.RegExp.Disjunction> = {
      type: 'Disjunction',
      Alternative: this.parseAlternative(),
      Disjunction: undefined,
    };
    if (this.eat('|')) {
      node.Disjunction = this.parseDisjunction();
    }
    return node;
  }


  // Alternative ::
  //   [empty]
  //   Term Alternative
  private parseAlternative() {
    let node: ParseNode.RegExp.Alternative = {
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
  private parseTerm(): ParseNode.RegExp.Term {
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
  private maybeParseAssertion(): ParseNode.RegExp.Assertion | undefined {
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
  private maybeParseQuantifier(): ParseNode.RegExp.Quantifier | undefined {
    let QuantifierPrefix: ParseNode.RegExp.Quantifier['QuantifierPrefix'] | undefined;

    if (this.eat('*')) {
      QuantifierPrefix = '*';
    } else if (this.eat('+')) {
      QuantifierPrefix = '+';
    } else if (this.eat('?')) {
      QuantifierPrefix = '?';
    } else if (this.eat('{')) {
      const DecimalDigits_a = Number.parseInt(this.parseDecimalDigits(), 10);
      let DecimalDigits_b;
      if (this.eat(',')) {
        if (this.test('}')) {
          DecimalDigits_b = Infinity;
        } else {
          DecimalDigits_b = Number.parseInt(this.parseDecimalDigits(), 10);
        }
        if (DecimalDigits_a > DecimalDigits_b) {
          this.raise('Numbers out of order in quantifier');
        }
      }
      QuantifierPrefix = {
        DecimalDigits_a,
        DecimalDigits_b,
      };
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

  private scanRegularExpressionModifiers() {
    let buffer = '';
    while (true) {
      if (this.position >= this.source.length) {
        return buffer;
      }
      const c = this.source[this.position];
      if (isRegularExpressionFlagPart(c)) {
        if (!'ims'.includes(c)) {
          this.raise(`Invalid RegExp modifier '${c}'`);
        } else if (buffer.includes(c)) {
          this.raise(`Invalid modifier '${c}' cannot appear more than once.`);
        }
        this.position += 1;
        buffer += c;
      } else {
        return buffer;
      }
    }
  }

  // Atom ::
  //   PatternCharacter
  //   `.`
  //   `\` AtomEscape
  //   CharacterClass
  //   `(` GroupSpecifier Disjunction `)`
  //   `(` `?` RegularExpressionFlags `:` Disjunction `)`
  //   `(` `?` RegularExpressionFlags `-` RegularExpressionFlags `:` Disjunction `)`
  private parseAtom(): ParseNode.RegExp.Atom {
    if (this.eat('.')) {
      return { type: 'Atom', subtype: '.', enclosedCapturingParentheses: 0 };
    }
    if (this.eat('\\')) {
      return this.parseAtomEscape();
    }
    if (this.eat('(')) {
      const node: ParseNode.RegExp.Mutable<ParseNode.RegExp.Atom_Group> = {
        type: 'Atom',
        capturingParenthesesBefore: this.capturingGroups.length,
        enclosedCapturingParentheses: 0,
        capturing: true,
        RegularExpressionFlags_a: undefined,
        RegularExpressionFlags_b: undefined,
        GroupSpecifier: undefined,
        Disjunction: undefined!,
      };
      if (this.eat('?')) {
        node.RegularExpressionFlags_a = this.scanRegularExpressionModifiers();
        if (this.eat('-')) {
          node.RegularExpressionFlags_b = this.scanRegularExpressionModifiers();
          node.capturing = false;
          if (!node.RegularExpressionFlags_a && !node.RegularExpressionFlags_b) {
            this.raise('Modifier expected');
          }
          this.checkDuplicateModifiers(node.RegularExpressionFlags_a, node.RegularExpressionFlags_b);
          this.expect(':');
        } else if (node.RegularExpressionFlags_a) {
          node.capturing = false;
          this.expect(':');
        } else if (this.eat(':')) {
          node.capturing = false;
        } else {
          node.GroupSpecifier = this.parseGroupName();
        }
      }
      if (node.capturing) {
        this.capturingGroups.push(node);
      }
      if (node.GroupSpecifier) {
        if (this.groupSpecifiers.has(node.GroupSpecifier)) {
          this.raise(`Duplicate group specifier '${node.GroupSpecifier}'`);
        }
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
      this.raise(`Expected a PatternCharacter but got ${this.peek()}`);
    }
    return {
      type: 'Atom',
      PatternCharacter: this.parseSourceCharacter(),
    };
  }

  private checkDuplicateModifiers(a: string, b: string) {
    if (b.length < a.length) {
      this.checkDuplicateModifiers(b, a);
      return;
    }
    for (let i = 0; i < a.length; i += 1) {
      const ch = a[i];
      if (b.includes(ch)) {
        this.raise(`Cannot both set and clear modifier '${ch}'.`);
      }
    }
  }

  // AtomEscape ::
  //   DecimalEscape
  //   CharacterClassEscape
  //   CharacterEscape
  //   [+N] `k` GroupName
  private parseAtomEscape(): ParseNode.RegExp.AtomEscape {
    if (this.plusN && this.eat('k')) {
      const node: ParseNode.RegExp.AtomEscape = {
        type: 'AtomEscape',
        position: this.position,
        GroupName: this.parseGroupName(),
      };
      this.groupNameRefs.push(node);
      return node;
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
  //
  // IdentityEscape ::
  //   [+U] SyntaxCharacter
  //   [+U] `/`
  //   [~U] SourceCharacterIdentityEscape
  //
  // SourceCharacterIdentityEscape ::
  //   [~N] SourceCharacter but not `c`
  //   [+N] SourceCharacter but not one of `c` or `k`
  private parseCharacterEscape(): ParseNode.RegExp.CharacterEscape {
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
        if (c === undefined) {
          if (this.plusU) {
            this.raise('Invalid identity escape');
          }
          return {
            type: 'CharacterEscape',
            IdentityEscape: 'c',
          };
        }
        const p = c.codePointAt(0)!;
        if ((p >= 65 && p <= 90) || (p >= 97 && p <= 122)) {
          return {
            type: 'CharacterEscape',
            ControlLetter: c,
          };
        }
        if (this.plusU) {
          this.raise('Invalid identity escape');
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
        if (this.plusU) {
          this.raise('Invalid identity escape');
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
        if (this.plusU) {
          this.raise('Invalid identity escape');
        }
        this.next();
        return {
          type: 'CharacterEscape',
          IdentityEscape: 'u',
        };
      }
      default: {
        const c = this.peek();
        if (c === undefined) {
          this.raise('Unexpected escape');
        }
        if (c === '0' && !isDecimalDigit(this.source[this.position + 1])) {
          return {
            type: 'CharacterEscape',
            subtype: this.next(),
          };
        }
        if (this.plusU) {
          if (c !== '/' && !isSyntaxCharacter(c)) {
            this.raise('Invalid identity escape');
          }
        } else {
          if (this.plusN ? c === 'c' || c === 'k' : c === 'c') {
            this.raise('Invalid identity escape');
          }
        }
        return {
          type: 'CharacterEscape',
          IdentityEscape: this.next(),
        };
      }
    }
  }

  // DecimalEscape ::
  //   NonZeroDigit DecimalDigits? [lookahead != DecimalDigit]
  private maybeParseDecimalEscape(): ParseNode.RegExp.DecimalEscape | undefined {
    if (isDecimalDigit(this.source[this.position]) && this.source[this.position] !== '0') {
      const start = this.position;
      let buffer = this.source[this.position];
      this.position += 1;
      while (isDecimalDigit(this.source[this.position])) {
        buffer += this.source[this.position];
        this.position += 1;
      }
      const node: ParseNode.RegExp.DecimalEscape = {
        type: 'DecimalEscape',
        position: start,
        value: Number.parseInt(buffer, 10),
      };
      this.decimalEscapes.push(node);
      return node;
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
  private maybeParseCharacterClassEscape(): ParseNode.RegExp.CharacterClassEscape | undefined {
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
            this.raise('Invalid unicode property name or value');
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
          this.raise('Invalid unicode property name or value');
        }
        if (sawDigit && this.eat('}')) {
          if (!(LoneUnicodePropertyNameOrValue in UnicodeGeneralCategoryValues
              || LoneUnicodePropertyNameOrValue in BinaryUnicodeProperties)) {
            this.raise('Invalid unicode property name or value');
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
              this.raise('Invalid unicode property value');
            }
            const c = this.source[this.position];
            if (!isControlLetter(c) && !isDecimalDigit(c) && c !== '_') {
              break;
            }
            this.position += 1;
            UnicodePropertyValue += c;
          }
          if (UnicodePropertyValue.length === 0) {
            this.raise('Invalid unicode property value');
          }
        }
        this.expect('}');
        if (UnicodePropertyValue) {
          if (!(LoneUnicodePropertyNameOrValue in NonbinaryUnicodeProperties)) {
            this.raise('Invalid unicode property name');
          }
          if (!(UnicodePropertyValue in UnicodeGeneralCategoryValues || UnicodePropertyValue in UnicodeScriptValues)) {
            this.raise('Invalid unicode property value');
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
          this.raise('Invalid unicode property name or value');
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
  private parseCharacterClass() {
    this.expect('[');
    const invert = this.eat('^');
    const ClassRanges = this.parseClassRanges();
    const node: ParseNode.RegExp.CharacterClass = {
      type: 'CharacterClass',
      invert,
      ClassRanges,
    };
    this.expect(']');
    return node;
  }

  // ClassRanges ::
  //   [empty]
  //   NonemptyClassRanges
  private parseClassRanges() {
    const ranges: ParseNode.RegExp.ClassRange[] = [];
    while (!this.test(']')) {
      if (this.position >= this.source.length) {
        this.raise('Unexpected end of CharacterClass');
      }
      const atom = this.parseClassAtom();
      if (this.eat('-')) {
        if (atom.type === 'CharacterClassEscape') {
          this.raise('Invalid class range');
        }
        if (this.test(']')) {
          ranges.push(atom);
          ranges.push({ type: 'ClassAtom', value: '-' });
        } else {
          const atom2 = this.parseClassAtom();
          if (atom2.type === 'CharacterClassEscape') {
            this.raise('Invalid class range');
          }
          if (CharacterValue(atom) > CharacterValue(atom2)) {
            this.raise('Invalid class range');
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
  private parseClassAtom(): ParseNode.RegExp.ClassAtom {
    if (this.eat('\\')) {
      if (this.eat('b')) {
        return {
          type: 'ClassEscape',
          value: 'b',
        };
      }
      if (this.plusU && this.eat('-')) {
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
      SourceCharacter: this.parseSourceCharacter(),
    };
  }

  private parseSourceCharacter() {
    const lead = this.source.charCodeAt(this.position);
    const trail = this.source.charCodeAt(this.position + 1);
    if (trail && isLeadingSurrogate(lead) && isTrailingSurrogate(trail)) {
      return this.next() + this.next();
    }
    return this.next();
  }

  private parseGroupName() {
    this.expect('<');
    const RegExpIdentifierName = this.parseRegExpIdentifierName();
    this.expect('>');
    return RegExpIdentifierName;
  }

  // RegExpIdentifierName ::
  //   RegExpIdentifierStart
  //   RegExpIdentifierName RegExpIdentifierPart
  private parseRegExpIdentifierName() {
    let buffer = '';
    let check = isIdentifierStart;
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      const code = c.charCodeAt(0);
      if (c === '\\') {
        this.position += 1;
        const RegExpUnicodeEscapeSequence = this.scope({ U: true }, () => this.maybeParseRegExpUnicodeEscapeSequence());
        if (!RegExpUnicodeEscapeSequence) {
          this.raise('Invalid unicode escape');
        }
        const raw = String.fromCodePoint(CharacterValue(RegExpUnicodeEscapeSequence));
        if (!check(raw)) {
          this.raise('Invalid identifier escape');
        }
        buffer += raw;
      } else if (isLeadingSurrogate(code)) {
        const lowSurrogate = this.source.charCodeAt(this.position + 1);
        if (!isTrailingSurrogate(lowSurrogate)) {
          this.raise('Invalid trailing surrogate');
        }
        const codePoint = UTF16SurrogatePairToCodePoint(code, lowSurrogate);
        const raw = String.fromCodePoint(codePoint);
        if (!check(raw)) {
          this.raise('Invalid surrogate pair');
        }
        this.position += 2;
        buffer += raw;
      } else if (check(c)) {
        buffer += c;
        this.position += 1;
      } else {
        break;
      }
      check = isIdentifierPart;
    }
    if (buffer.length === 0) {
      this.raise('Invalid empty identifier');
    }
    return buffer;
  }

  // DecimalDigits ::
  //   DecimalDigit
  //   DecimalDigits DecimalDigit
  private parseDecimalDigits() {
    let n = '';
    if (!isDecimalDigit(this.peek())) {
      this.raise('Invalid decimal digits');
    }
    while (isDecimalDigit(this.peek())) {
      n += this.next();
    }
    return n;
  }

  // HexEscapeSequence ::
  //   `x` HexDigit HexDigit
  private parseHexEscapeSequence(): ParseNode.RegExp.HexEscapeSequence {
    this.expect('x');
    const HexDigit_a = this.next();
    if (!isHexDigit(HexDigit_a)) {
      this.raise('Not a hex digit');
    }
    const HexDigit_b = this.next();
    if (!isHexDigit(HexDigit_b)) {
      this.raise('Not a hex digit');
    }
    return {
      type: 'HexEscapeSequence',
      HexDigit_a,
      HexDigit_b,
    };
  }

  private scanHex(length: number) {
    if (length === 0) {
      this.raise('Invalid code point');
    }
    let n = 0;
    for (let i = 0; i < length; i += 1) {
      const c = this.source[this.position];
      if (isHexDigit(c)) {
        this.position += 1;
        n = (n << 4) | Number.parseInt(c, 16);
      } else {
        this.raise('Invalid hex digit');
      }
    }
    return n;
  }

  // RegExpUnicodeEscapeSequence ::
  //   [+U] `u` HexLeadSurrogate `\u` HexTrailSurrogate
  //   [+U] `u` HexLeadSurrogate
  //   [+U] `u` HexTrailSurrogate
  //   [+U] `u` HexNonSurrogate
  //   [~U] `u` Hex4Digits
  //   [+U] `u{` CodePoint `}`
  private maybeParseRegExpUnicodeEscapeSequence(): ParseNode.RegExp.RegExpUnicodeEscapeSequence | undefined {
    const start = this.position;
    if (!this.eat('u')) {
      this.position = start;
      return undefined;
    }
    if (this.plusU && this.eat('{')) {
      const end = this.source.indexOf('}', this.position);
      if (end === -1) {
        this.raise('Invalid code point');
      }
      const code = this.scanHex(end - this.position);
      if (code > 0x10FFFF) {
        this.raise('Invalid code point');
      }
      this.position += 1;
      return {
        type: 'RegExpUnicodeEscapeSequence',
        CodePoint: code,
      };
    }
    let lead;
    try {
      lead = this.scanHex(4);
    } catch {
      this.position = start;
      return undefined;
    }
    if (this.plusU && isLeadingSurrogate(lead)) {
      const back = this.position;
      if (this.eat('\\') && this.eat('u')) {
        let trail;
        try {
          trail = this.scanHex(4);
        } catch {
          this.position = back;
        }
        return {
          type: 'RegExpUnicodeEscapeSequence',
          HexLeadSurrogate: lead,
          HexTrailSurrogate: trail,
        };
      }
      return {
        type: 'RegExpUnicodeEscapeSequence',
        HexLeadSurrogate: lead,
      };
    }
    return {
      type: 'RegExpUnicodeEscapeSequence',
      Hex4Digits: lead,
    };
  }
}
