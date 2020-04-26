const isClosingSyntaxCharacter = (c) => ')]}|'.includes(c);
const isDecimalDigit = (c) => /[0123456789]/u.test(c);

export class RegExpParser {
  constructor(source, BMP) {
    this.source = source;
    this.position = 0;
    this.plusU = !BMP;
    this.capturingGroups = [];
    this.groupSpecifiers = new Map();
  }

  peek() {
    return this.source[this.position];
  }

  eat(c) {
    if (this.source[this.position] === c) {
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
      AlternativeList: [],
    };
    do {
      node.AlternativeList.push(this.parseAlternative());
    } while (this.eat('|'));
    return node;
  }


  // Alternative ::
  //   [empty]
  //   Term Alternative
  parseAlternative() {
    const node = {
      type: 'Alternative',
      TermList: [],
    };
    while (this.position < this.source.length
           && !isClosingSyntaxCharacter(this.peek())) {
      node.TermList.push(this.parseTerm());
    }
    return node;
  }

  // Term ::
  //   Assertion
  //   Atom
  //   Atom Quantifier
  // Assertion ::
  //   `^`
  //   `$`
  //   `\` `b`
  //   `\` `B`
  //   `(` `?` `=` Disjunction `)`
  //   `(` `?` `!` Disjunction `)`
  //   `(` `?` `<=` Disjunction `)`
  //   `(` `?` `<!` Disjunction `)`
  parseTerm() {
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

    return {
      type: 'Term',
      capturingParenthesesBefore: this.capturingGroups.length,
      Atom: this.parseAtom(),
      Quantifier: this.parseQuantifier(),
    };
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
  parseQuantifier() {
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
      QuantifierPrefix.DecimalDigits_a = this.parseDecimalDigits();
      if (this.eat(',')) {
        if (!this.test('}')) {
          QuantifierPrefix.DecimalDigits_b = this.parseDecimalDigits();
        }
      }
      this.expect('}');
    }

    if (QuantifierPrefix) {
      return {
        type: 'Quantifier',
        QuantifierPrefix,
        greedy: this.eat('?'),
      };
    }

    return undefined;
  }

  parseDecimalDigits() {
    let n = '';
    while (isDecimalDigit(this.peek())) {
      n += this.next();
    }
    return n;
  }

  // Atom ::
  //   PatternCharacter
  //   `.`
  //   `\` AtomEscape
  //   CharacterClass
  //   `(` GroupSpecifier Disjunction `)`
  //   `(` `?` `:` Disjunction `)`
  // GroupSpecifier :
  //   [empty]
  //   `?` GroupName
  // GroupName ::
  //  `<` RegExpIdentifierName `>`
  parseAtom() {
    if (this.eat('.')) {
      return { type: 'Atom', subtype: '.', enclosedCapturingParentheses: 0 };
    }
    if (this.eat('(')) {
      const node = {
        type: 'Atom',
        subtype: 'group',
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
          this.expect('<');
          node.GroupSpecifier = this.parseIdentifierName();
          this.expect('>');
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
    if (this.eat('[')) {
      const node = {
        type: 'Atom',
        subtype: 'CharacterClass',
        enclosedCapturingParentheses: 0,
        inverse: this.eat('^'),
        ClassRanges: this.parseClassRanges(),
      };
      this.expect(']');
      return node;
    }
    return {
      type: 'Atom',
      subtype: 'PatternCharacter',
      enclosedCapturingParentheses: 0,
      value: this.next(),
    };
  }

  // RegExpidentifierName ::
  //   RegExpIdentifierStart
  //   RegExpIdentifierName RegExpIdentifierPart
  parseIdentifierName() {
    let name = '';
    while (/\p{ID_Start}|\p{ID_Continue}|\$/u.test(this.peek())) {
      name += this.next();
    }
    return name;
  }
}
