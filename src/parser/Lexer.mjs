import {
  RawTokens,
  Token, KeywordLookup, TokenNames,
  isKeywordRaw,
} from './tokens.mjs';

const isIdentifierStart = (c) => /\p{ID_Start}/u.test(c);
const isIdentifierContinue = (c) => /\p{ID_Continue}/u.test(c);
const isDecimalDigit = (c) => /\d/u.test(c);
const isHexDigit = (c) => /[\da-f]/ui.test(c);
const isOctalDigit = (c) => /[0-7]/u.test(c);
const isBinaryDigit = (c) => c === '0' || c === '1';
const isWhitespace = (c) => /[\u0009\u000B\u000C\u0020\u00A0\uFEFF]|\p{Space_Separator}/u.test(c); // eslint-disable-line no-control-regex
export const isNewline = (c) => /\r\n?|[\n\u2028\u2029]/u.test(c);
const isRegularExpressionFlagPart = (c) => (isIdentifierContinue(c) || c === '$');

const SingleCharTokens = {
  '__proto__': null,
  '0': Token.NUMBER,
  '1': Token.NUMBER,
  '2': Token.NUMBER,
  '3': Token.NUMBER,
  '4': Token.NUMBER,
  '5': Token.NUMBER,
  '6': Token.NUMBER,
  '7': Token.NUMBER,
  '8': Token.NUMBER,
  '9': Token.NUMBER,
  'a': Token.IDENTIFIER,
  'b': Token.IDENTIFIER,
  'c': Token.IDENTIFIER,
  'd': Token.IDENTIFIER,
  'e': Token.IDENTIFIER,
  'f': Token.IDENTIFIER,
  'g': Token.IDENTIFIER,
  'h': Token.IDENTIFIER,
  'i': Token.IDENTIFIER,
  'j': Token.IDENTIFIER,
  'k': Token.IDENTIFIER,
  'l': Token.IDENTIFIER,
  'm': Token.IDENTIFIER,
  'n': Token.IDENTIFIER,
  'o': Token.IDENTIFIER,
  'p': Token.IDENTIFIER,
  'q': Token.IDENTIFIER,
  'r': Token.IDENTIFIER,
  's': Token.IDENTIFIER,
  't': Token.IDENTIFIER,
  'u': Token.IDENTIFIER,
  'v': Token.IDENTIFIER,
  'w': Token.IDENTIFIER,
  'x': Token.IDENTIFIER,
  'y': Token.IDENTIFIER,
  'z': Token.IDENTIFIER,
  'A': Token.IDENTIFIER,
  'B': Token.IDENTIFIER,
  'C': Token.IDENTIFIER,
  'D': Token.IDENTIFIER,
  'E': Token.IDENTIFIER,
  'F': Token.IDENTIFIER,
  'G': Token.IDENTIFIER,
  'H': Token.IDENTIFIER,
  'I': Token.IDENTIFIER,
  'J': Token.IDENTIFIER,
  'K': Token.IDENTIFIER,
  'L': Token.IDENTIFIER,
  'M': Token.IDENTIFIER,
  'N': Token.IDENTIFIER,
  'O': Token.IDENTIFIER,
  'P': Token.IDENTIFIER,
  'Q': Token.IDENTIFIER,
  'R': Token.IDENTIFIER,
  'S': Token.IDENTIFIER,
  'T': Token.IDENTIFIER,
  'U': Token.IDENTIFIER,
  'V': Token.IDENTIFIER,
  'W': Token.IDENTIFIER,
  'X': Token.IDENTIFIER,
  'Y': Token.IDENTIFIER,
  'Z': Token.IDENTIFIER,
  '$': Token.IDENTIFIER,
  '_': Token.IDENTIFIER,
  '.': Token.PERIOD,
  ',': Token.COMMA,
  ':': Token.COLON,
  ';': Token.SEMICOLON,
  '%': Token.MOD,
  '~': Token.BIT_NOT,
  '!': Token.NOT,
  '+': Token.ADD,
  '-': Token.SUB,
  '*': Token.MUL,
  '<': Token.LT,
  '>': Token.GT,
  '=': Token.ASSIGN,
  '?': Token.CONDITIONAL,
  '[': Token.LBRACK,
  ']': Token.RBRACK,
  '(': Token.LPAREN,
  ')': Token.RPAREN,
  '/': Token.DIV,
  '^': Token.BIT_XOR,
  '`': Token.TEMPLATE,
  '{': Token.LBRACE,
  '}': Token.RBRACE,
  '&': Token.BIT_AND,
  '|': Token.BIT_OR,
  '"': Token.STRING,
  '\'': Token.STRING,
};

export class Lexer {
  constructor() {
    this.currentToken = null;
    this.lookahead = null;
    this.position = 0;
    this.line = 1;
    this.columnOffset = 0;
    this.scannedValue = undefined;
    this.hasLineTerminatorBeforeNextFlag = false;
    this.positionForNextToken = 0;
    this.lineForNextToken = 0;
    this.columnForNextToken = 0;
  }

  advance() {
    const type = this.nextToken();
    return {
      type,
      startIndex: this.positionForNextToken,
      endIndex: this.position,
      line: this.lineForNextToken,
      column: this.columnForNextToken,
      name: TokenNames[type],
      value: (
        type === Token.IDENTIFIER
        || type === Token.NUMBER
        || type === Token.BIGINT
        || type === Token.STRING
      ) ? this.scannedValue : RawTokens[type][1],
    };
  }

  next() {
    this.hasLineTerminatorBeforeNextFlag = false;
    this.currentToken = this.lookahead;
    this.lookahead = this.advance();
    return this.currentToken;
  }

  test(token) {
    return this.lookahead.type === token;
  }

  eat(token) {
    if (this.lookahead.type === token) {
      this.next();
      return true;
    }
    return false;
  }

  expect(token) {
    const next = this.next();
    if (next.type !== token) {
      this.unexpected(next);
    }
  }

  hasLineTerminatorBeforeNext() {
    return this.hasLineTerminatorBeforeNextFlag;
  }

  skipSpace() {
    loop: // eslint-disable-line no-labels
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      switch (c) {
        case ' ':
        case '\t':
          this.position += 1;
          break;
        case '\r':
          this.position += 1;
          if (this.source[this.position + 1] === '\n') {
            this.position += 1;
          }
          this.line += 1;
          this.columnOffset = this.position;
          this.hasLineTerminatorBeforeNextFlag = true;
          break;
        case '\n':
          this.position += 1;
          this.line += 1;
          this.columnOffset = this.position;
          this.hasLineTerminatorBeforeNextFlag = true;
          break;
        case '/':
          switch (this.source[this.position + 1]) {
            case '/':
              this.skipLineComment();
              break;
            case '*':
              this.skipBlockComment();
              break;
            default:
              break loop; // eslint-disable-line no-labels
          }
          break;
        default:
          if (isWhitespace(c)) {
            this.position += 1;
          } else {
            break loop; // eslint-disable-line no-labels
          }
          break;
      }
    }
  }

  skipLineComment() {
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      this.position += 1;
      if (isNewline(c)) {
        if (c === '\r' && this.source[this.position] === '\n') {
          this.position += 1;
        }
        this.line += 1;
        this.columnOffset = this.position;
        this.hasLineTerminatorBeforeNextFlag = true;
        break;
      }
    }
  }

  skipBlockComment() {
    const end = this.source.indexOf('*/', this.position);
    if (end === -1) {
      this.report('UnterminatedComment', this.position);
    }
    this.position += 2;
    {
      const re = /\r\n?|[\n\u2028\u2029]/g;
      re.lastIndex = this.position;
      const match = re.exec(this.source);
      if (match.index < end) {
        this.line += 1;
        this.columnOffset = this.position;
        this.hasLineTerminatorBeforeNextFlag = true;
      }
    }
    this.position = end + 2;
  }

  nextToken() {
    this.skipSpace();

    // set token location info after skipping space
    this.positionForNextToken = this.position;
    this.lineForNextToken = this.line;
    this.columnForNextToken = this.position - this.columnOffset;

    if (this.position >= this.source.length) {
      return Token.EOS;
    }
    const c = this.source[this.position];
    this.position += 1;
    const c1 = this.source[this.position];
    if (c.charCodeAt(0) <= 127) {
      const single = SingleCharTokens[c];
      switch (single) {
        case Token.LPAREN:
        case Token.RPAREN:
        case Token.LBRACE:
        case Token.RBRACE:
        case Token.LBRACK:
        case Token.RBRACK:
        case Token.COLON:
        case Token.SEMICOLON:
        case Token.COMMA:
        case Token.BIT_NOT:
        case Token.TEMPLATE:
          return single;

        case Token.CONDITIONAL:
          // ? ?. ?? ??=
          if (c1 === '.' && !isDecimalDigit(this.source[this.position + 2])) {
            this.position += 1;
            return Token.QUESTION_PERIOD;
          }
          if (c1 === '?') {
            this.position += 1;
            if (this.source[this.position] === '=' && this.feature('LogicalAssignment')) {
              this.position += 1;
              return Token.ASSIGN_NULLISH;
            }
            return Token.NULLISH;
          }
          return Token.CONDITIONAL;

        case Token.LT:
          // < <= << <<=
          if (c1 === '=') {
            this.position += 1;
            return Token.LTE;
          }
          if (c1 === '<') {
            this.position += 1;
            if (this.source[this.position] === '=') {
              this.position += 1;
              return Token.ASSIGN_SHL;
            }
            return Token.SHL;
          }
          return Token.LT;

        case Token.GT:
          // > >= >> >>= >>> >>>=
          if (c1 === '=') {
            this.position += 1;
            return Token.GTE;
          }
          if (c1 === '>') {
            this.position += 1;
            if (this.source[this.position] === '>') {
              this.position += 1;
              if (this.source[this.position] === '=') {
                this.position += 1;
                return Token.ASSIGN_SHR;
              }
              return Token.SHR;
            }
            if (this.source[this.position] === '=') {
              this.position += 1;
              return Token.ASSIGN_SAR;
            }
            return Token.SAR;
          }
          return Token.GT;

        case Token.ASSIGN:
          // = == === =>
          if (c1 === '=') {
            this.position += 1;
            if (this.source[this.position] === '=') {
              this.position += 1;
              return Token.EQ_STRICT;
            }
            return Token.EQ;
          }
          if (c1 === '>') {
            this.position += 1;
            return Token.ARROW;
          }
          return Token.ASSIGN;

        case Token.NOT:
          // ! != !==
          if (c1 === '=') {
            this.position += 1;
            if (this.source[this.position] === '=') {
              this.position += 1;
              return Token.NE_STRICT;
            }
            return Token.NE;
          }
          return Token.NOT;

        case Token.ADD:
          // + ++ +=
          if (c1 === '+') {
            this.position += 1;
            return Token.INC;
          }
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_ADD;
          }
          return Token.ADD;

        case Token.SUB:
          // - -- -=
          if (c1 === '-') {
            this.position += 1;
            return Token.DEC;
          }
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_SUB;
          }
          return Token.SUB;

        case Token.MUL:
          // * *= ** **=
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_MUL;
          }
          if (c1 === '*') {
            this.position += 1;
            if (this.source[this.position] === '=') {
              this.position += 1;
              return Token.ASSIGN_EXP;
            }
            return Token.EXP;
          }
          return Token.MUL;

        case Token.MOD:
          // % %=
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_MOD;
          }
          return Token.MOD;

        case Token.DIV:
          // / /=
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_DIV;
          }
          return Token.DIV;

        case Token.BIT_AND:
          // & && &= &&=
          if (c1 === '&') {
            this.position += 1;
            if (this.source[this.position] === '=' && this.feature('LogicalAssignment')) {
              this.position += 1;
              return Token.ASSIGN_AND;
            }
            return Token.AND;
          }
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_BIT_AND;
          }
          return Token.BIT_AND;

        case Token.BIT_OR:
          // | || |=
          if (c1 === '|') {
            this.position += 1;
            if (this.source[this.position] === '=' && this.feature('LogicalAssignment')) {
              this.position += 1;
              return Token.ASSIGN_OR;
            }
            return Token.OR;
          }
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_BIT_OR;
          }
          return Token.BIT_OR;

        case Token.BIT_XOR:
          // ^ ^=
          if (c1 === '=') {
            this.position += 1;
            return Token.ASSIGN_BIT_XOR;
          }
          return Token.BIT_XOR;

        case Token.PERIOD:
          // . ... NUMBER
          if (isDecimalDigit(c1)) {
            return this.scanNumber(true);
          }
          if (c1 === '.') {
            if (this.source[this.position + 1] === '.') {
              this.position += 2;
              return Token.ELLIPSIS;
            }
          }
          return Token.PERIOD;

        case Token.STRING:
          return this.scanString(c);

        case Token.NUMBER:
          return this.scanNumber(false);

        case Token.IDENTIFIER:
          return this.scanIdentifierOrKeyword();

        default:
          this.unexpected(c);
      }
    }

    if (isIdentifierStart(c)) {
      return this.scanIdentifierOrKeyword();
    }

    return this.unexpected(c);
  }

  scanNumber(decimal) {
    let afterDecimal = decimal;
    let buffer = this.source[this.position - 1];
    let base = 10;
    let first = true;
    let bigint = false;
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      if (first) {
        first = false;
        if (c === 'x' || c === 'X') {
          this.position += 1;
          base = 16;
          continue;
        } else if (c === 'o' || c === 'O') {
          this.position += 1;
          base = 8;
          continue;
        } else if (c === 'b' || c === 'B') {
          this.position += 1;
          base = 2;
          continue;
        }
      }
      if (!afterDecimal && c === 'n') {
        this.position += 1;
        bigint = true;
      }
      const single = SingleCharTokens[c];
      if (base === 10 && single === Token.PERIOD) {
        if (afterDecimal) {
          break;
        } else {
          afterDecimal = true;
          this.position += 1;
          buffer += c;
        }
        continue;
      }
      if (single === Token.NUMBER) {
        if (base === 2 && !isBinaryDigit(c)) {
          this.report('InvalidBinaryLiteral', this.position);
        } else if (base === 8 && !isOctalDigit(c)) {
          this.report('InvalidOctalLiteral', this.position);
        }
        this.position += 1;
        buffer += c;
        continue;
      }
      if (base === 16 && isHexDigit(c)) {
        this.position += 1;
        buffer += c;
        continue;
      }
      break;
    }
    if (bigint) {
      this.scannedValue = BigInt(buffer);
      return Token.BIGINT;
    }
    this.scannedValue = base === 10
      ? Number.parseFloat(buffer, base)
      : Number.parseInt(buffer, base);
    return Token.NUMBER;
  }

  scanString(char) {
    let buffer = '';
    while (true) {
      if (this.position >= this.source.length) {
        this.report('UnterminatedString', this.position);
      }
      const c = this.source[this.position];
      if (c === char) {
        this.position += 1;
        break;
      }
      if (isNewline(c)) {
        this.report('UnterminatedString', this.position);
      }
      this.position += 1;
      if (c === '\\') {
        buffer += this.scanEscapeSequence();
      } else {
        buffer += c;
      }
    }
    this.scannedValue = buffer;
    return Token.STRING;
  }

  scanEscapeSequence() {
    const c = this.source[this.position];
    switch (c) {
      case 'n':
        this.position += 1;
        return '\n';
      case 'r':
        this.position += 1;
        return '\r';
      case 'x':
        return this.scanHex();
      case 'u':
        return String.fromCodePoint(this.scanCodePoint());
      case 't':
        this.position += 1;
        return '\t';
      case 'b':
        this.position += 1;
        return '\b';
      case 'v':
        this.position += 1;
        return '\v';
      default:
        this.position += 1;
        return c;
    }
  }

  scanCodePoint() {
    if (this.source[this.position] === '{') {
      const end = this.source.indexOf('}', this.position);
      const code = this.scanHex(end - this.position);
      if (code > 0x10FFFF) {
        this.report('InvalidCodePoint', this.position);
      }
      return code;
    }
    return this.scanHex(4);
  }

  scanHex(n) {
    for (let i = 0; i < n; i += 1) {
      const c = this.source[this.position];
    }
  }

  scanIdentifierOrKeyword() {
    let buffer = this.source[this.position - 1];
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      const single = SingleCharTokens[c];
      if (single === Token.IDENTIFIER || single === Token.NUMBER) {
        buffer += c;
      } else if (isIdentifierContinue(c)) {
        buffer += c;
      } else {
        break;
      }
      this.position += 1;
    }
    if (isKeywordRaw(buffer)) {
      return KeywordLookup[buffer];
    } else {
      this.scannedValue = buffer;
      return Token.IDENTIFIER;
    }
  }

  scanRegularExpressionBody() {
    let inClass = false;
    let buffer = this.lookahead.type === Token.ASSIGN_DIV ? '=' : '';
    while (true) {
      if (this.position >= this.source.length) {
        this.report('UnterminatedRegExp', this.position);
      }
      const c = this.source[this.position];
      switch (c) {
        case '[':
          inClass = true;
          this.position += 1;
          buffer += c;
          break;
        case ']':
          if (inClass) {
            inClass = false;
          }
          this.position += 1;
          break;
        case '/':
          this.position += 1;
          if (inClass) {
            buffer += c;
            break;
          }
          this.scannedValue = buffer;
          return;
        default:
          if (isNewline(c)) {
            this.report('UnterminatedRegExp', this.position);
          }
          this.position += 1;
          buffer += c;
          break;
      }
    }
  }

  scanRegularExpressionFlags() {
    let buffer = '';
    while (true) {
      if (this.position >= this.source.length) {
        this.scannedValue = buffer;
        return;
      }
      const c = this.source[this.position];
      if (isRegularExpressionFlagPart(c)) {
        this.position += 1;
        buffer += c;
      } else {
        this.scannedValue = buffer;
        return;
      }
    }
  }
}
