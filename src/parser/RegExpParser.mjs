const isClosingSyntaxCharacter = (c) => ')]}|'.includes(c);

export class RegExpParser {
  constructor(source, BMP) {
    this.source = source;
    this.position = 0;
    this.plusU = !BMP;
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
    return this.parseDisjunction();
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
      return { type: 'Assertion', value: '^' };
    }
    if (this.eat('$')) {
      return { type: 'Assertion', value: '$' };
    }

    const look2 = this.source.slice(this.position, this.position + 2);
    if (look2 === '\\b') {
      this.position += 2;
      return { type: 'Assertion', value: 'b' };
    }
    if (look2 === '\\B') {
      this.position += 2;
      return { type: 'Assertion', value: 'B' };
    }

    const look3 = this.source.slice(this.position, this.position + 3);
    if (look3 === '(?=') {
      this.position += 3;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        value: '?=',
        Disjunction: d,
      };
    }
    if (look3 === '(?!') {
      this.position += 3;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        value: '?!',
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
        value: '?<=',
        Disjunction: d,
      };
    }
    if (look4 === '(?<!') {
      this.position += 4;
      const d = this.parseDisjunction();
      this.expect(')');
      return {
        type: 'Assertion',
        value: '?<!',
        Disjunction: d,
      };
    }

    const term = {
      type: 'Term',
      Atom: this.parseAtom(),
      Quantifier: undefined,
    };

    if (this.eat('*')) {
      term.Quantifier = '*';
    } else if (this.eat('+')) {
      term.Quantifier = '+';
    } else if (this.eat('?')) {
      term.Quantifier = '?';
    }

    return term;
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
      return { type: 'Atom', value: '.' };
    }
    if (this.eat('(')) {
      const node = {
        type: 'Group',
        nonCapturing: false,
        GroupSpecifier: undefined,
        Disjunction: undefined,
      };
      if (this.eat('?')) {
        if (this.eat(':')) {
          node.nonCapturing = true;
        } else {
          this.expect('<');
          node.GroupSpecifier = this.parseIdentifierName();
          this.expect('>');
        }
      }
      node.Disjunction = this.parseDisjunction();
      this.expect(')');
      return node;
    }
    return { type: 'PatternCharacter', value: this.next() };
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
