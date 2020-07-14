import isIdentifierStartRegex from 'unicode-13.0.0/Binary_Property/ID_Start/regex';
import isIdentifierContinueRegex from 'unicode-13.0.0/Binary_Property/ID_Continue/regex';
import isSpaceSeparatorRegex from 'unicode-13.0.0/General_Category/Space_Separator/regex';
import {
  RawTokens,
  Token, KeywordLookup, TokenNames,
  isKeywordRaw,
} from './tokens.mjs';

export const isIdentifierStart = (c) => c && isIdentifierStartRegex.test(c);
export const isIdentifierContinue = (c) => c && isIdentifierContinueRegex.test(c);
const isDecimalDigit = (c) => c && /\d/u.test(c);
export const isHexDigit = (c) => c && /[\da-f]/ui.test(c);
const isOctalDigit = (c) => c && /[0-7]/u.test(c);
const isBinaryDigit = (c) => c === '0' || c === '1';
const isWhitespace = (c) => c && (/[\u0009\u000B\u000C\u0020\u00A0\uFEFF]/u.test(c) || isSpaceSeparatorRegex.test(c)); // eslint-disable-line no-control-regex
export const isLineTerminator = (c) => c && /[\r\n\u2028\u2029]/u.test(c);
const isRegularExpressionFlagPart = (c) => c && (isIdentifierContinue(c) || c === '$');

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
  '\\': Token.IDENTIFIER,
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
    this.currentToken = undefined;
    this.peekToken = undefined;
    this.peekAheadToken = undefined;

    this.position = 0;
    this.line = 1;
    this.columnOffset = 0;
    this.scannedValue = undefined;
    this.lineTerminatorBeforeNextToken = false;
    this.positionForNextToken = 0;
    this.lineForNextToken = 0;
    this.columnForNextToken = 0;
  }

  advance() {
    this.lineTerminatorBeforeNextToken = false;
    const type = this.nextToken();
    return {
      type,
      startIndex: this.positionForNextToken,
      endIndex: this.position,
      line: this.lineForNextToken,
      column: this.columnForNextToken,
      hadLineTerminatorBefore: this.lineTerminatorBeforeNextToken,
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
    this.currentToken = this.peekToken;
    if (this.peekAheadToken !== undefined) {
      this.peekToken = this.peekAheadToken;
      this.peekAheadToken = undefined;
    } else {
      this.peekToken = this.advance();
    }
    return this.currentToken;
  }

  peek() {
    if (this.peekToken === undefined) {
      this.next();
    }
    return this.peekToken;
  }

  peekAhead() {
    if (this.peekAheadToken === undefined) {
      this.peek();
      this.peekAheadToken = this.advance();
    }
    return this.peekAheadToken;
  }

  matches(token, peek) {
    if (typeof token === 'string') {
      if (peek.type === Token.IDENTIFIER && peek.value === token) {
        const escapeIndex = this.source.slice(peek.startIndex, peek.endIndex).indexOf('\\');
        if (escapeIndex !== -1) {
          this.unexpected(escapeIndex + peek.startIndex);
        }
        return true;
      } else {
        return false;
      }
    }
    return peek.type === token;
  }

  test(token) {
    return this.matches(token, this.peek());
  }

  testAhead(token) {
    return this.matches(token, this.peekAhead());
  }

  eat(token) {
    if (this.test(token)) {
      this.next();
      return true;
    }
    return false;
  }

  expect(token) {
    if (this.test(token)) {
      return this.next();
    }
    return this.unexpected();
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
          } else if (isLineTerminator(c)) {
            this.position += 1;
            if (c === '\r' && this.source[this.position] === '\n') {
              this.position += 1;
            }
            this.line += 1;
            this.columnOffset = this.position;
            this.lineTerminatorBeforeNextToken = true;
            break;
          } else {
            break loop; // eslint-disable-line no-labels
          }
          break;
      }
    }
  }

  skipHashbangComment() {
    if (this.position === 0
        && this.source[0] === '#'
        && this.source[1] === '!') {
      this.skipLineComment();
    }
  }

  skipLineComment() {
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      this.position += 1;
      if (isLineTerminator(c)) {
        if (c === '\r' && this.source[this.position] === '\n') {
          this.position += 1;
        }
        this.line += 1;
        this.columnOffset = this.position;
        this.lineTerminatorBeforeNextToken = true;
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
    for (const match of this.source.slice(this.position, end).matchAll(/\r\n?|[\n\u2028\u2029]/ug)) {
      this.position = match.index;
      this.line += 1;
      this.columnOffset = this.position;
      this.lineTerminatorBeforeNextToken = true;
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
          if (c1 === '.' && !isDecimalDigit(this.source[this.position + 1])) {
            this.position += 1;
            return Token.OPTIONAL;
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
          this.position -= 1;
          return this.scanIdentifierOrKeyword();

        default:
          this.unexpected(single);
          break;
      }
    }

    if (isIdentifierStart(c)) {
      this.position -= 1;
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
    } else {
      let c = this.source[this.position];
      if (c === 'e' || c === 'E') {
        this.position += 1;
        buffer += c;
        c = this.source[this.position];
        if (c === '+' || c === '-') {
          this.position += 1;
          buffer += c;
          c = this.source[this.position];
        }
        if (!isDecimalDigit(c)) {
          this.report('UnterminatedNumber', this.position);
        }
        while (true) {
          c = this.source[this.position];
          if (!isDecimalDigit(c)) {
            break;
          }
          this.position += 1;
          buffer += c;
        }
      }
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
      if (c === '\r' || c === '\n') {
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
      case 'b':
        this.position += 1;
        return '\b';
      case 't':
        this.position += 1;
        return '\t';
      case 'n':
        this.position += 1;
        return '\n';
      case 'v':
        this.position += 1;
        return '\v';
      case 'f':
        this.position += 1;
        return '\f';
      case 'r':
        this.position += 1;
        return '\r';
      case 'x':
        this.position += 1;
        return String.fromCodePoint(this.scanHex(2));
      case 'u':
        this.position += 1;
        return String.fromCodePoint(this.scanCodePoint());
      default:
        this.position += 1;
        return c;
    }
  }

  scanCodePoint() {
    if (this.source[this.position] === '{') {
      const end = this.source.indexOf('}', this.position);
      this.position += 1;
      const code = this.scanHex(end - this.position);
      this.position += 1;
      if (code > 0x10FFFF) {
        this.report('InvalidCodePoint', this.position);
      }
      return code;
    }
    return this.scanHex(4);
  }

  scanHex(length) {
    if (length === 0) {
      this.report('InvalidCodePoint', this.position);
    }
    let n = 0;
    for (let i = 0; i < length; i += 1) {
      const c = this.source[this.position];
      if (isHexDigit(c)) {
        this.position += 1;
        n = (n << 4) | Number.parseInt(c, 16);
      } else {
        this.unexpected(this.position);
      }
    }
    return n;
  }

  scanIdentifierOrKeyword() {
    let buffer = '';
    let escapeIndex = -1;
    while (this.position < this.source.length) {
      const c = this.source[this.position];
      const code = c.charCodeAt(0);
      if (c === '\\') {
        if (escapeIndex === -1) {
          escapeIndex = this.position;
        }
        this.position += 1;
        if (this.source[this.position] !== 'u') {
          this.unexpected(this.position);
        }
        this.position += 1;
        const raw = String.fromCodePoint(this.scanCodePoint());
        if (!(SingleCharTokens[raw] === Token.IDENTIFIER || isIdentifierContinue(raw))) {
          this.unexpected(escapeIndex);
        }
        buffer += raw;
      } else if (SingleCharTokens[c] === Token.IDENTIFIER || isIdentifierContinue(c)) {
        this.position += 1;
        buffer += c;
      } else if (code >= 0xD800 && code <= 0xDBFF) {
        const lowSurrogate = this.source.charCodeAt(this.position + 1);
        if (lowSurrogate < 0xDC00 || lowSurrogate > 0xDFFF) {
          this.unexpected(this.position);
        }
        const raw = String.fromCodePoint((code - 0xD800) * 0x400 + (lowSurrogate - 0xDC00) + 0x10000);
        if (!(SingleCharTokens[raw] === Token.IDENTIFIER || isIdentifierContinue(raw))) {
          this.unexpected(this.position);
        }
        this.position += 2;
        buffer += raw;
      } else {
        break;
      }
    }
    if (isKeywordRaw(buffer)) {
      if (escapeIndex !== -1) {
        this.unexpected(escapeIndex);
      }
      return KeywordLookup[buffer];
    } else {
      this.scannedValue = buffer;
      return Token.IDENTIFIER;
    }
  }

  scanRegularExpressionBody() {
    let inClass = false;
    let buffer = this.peek().type === Token.ASSIGN_DIV ? '=' : '';
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
          buffer += c;
          this.position += 1;
          break;
        case '/':
          this.position += 1;
          if (inClass || this.source[this.position - 2] === '\\') {
            buffer += c;
            break;
          }
          this.scannedValue = buffer;
          return;
        default:
          if (isLineTerminator(c)) {
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
