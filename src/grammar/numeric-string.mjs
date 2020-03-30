import * as acorn from 'acorn';

const { isNewLine, nonASCIIwhitespace } = acorn;

function isWhiteSpace(c) {
  return c === '\x09' // CHARACTER TABULATION
    || c === '\x0B' // LINE TABULATION
    || c === '\x0C' // FORM FEED (FF)
    || c === '\x20' // SPACE
    || c === '\xA0' // NO-BREAK SPACE
    || nonASCIIwhitespace.test(c);
}

const isLineTerminator = (c) => isNewLine(c.charCodeAt(0), false);

const isStrWhiteSpaceChar = (c) => isWhiteSpace(c) || isLineTerminator(c);

// Returns index of first non-StrWhiteSpaceChar character.
export function searchNotStrWhiteSpaceChar(str) {
  for (let i = 0; i < str.length; i += 1) {
    if (!isStrWhiteSpaceChar(str[i])) {
      return i;
    }
  }
  return str.length;
}

// Returns index of last non-StrWhiteSpaceChar character + 1.
export function reverseSearchNotStrWhiteSpaceChar(str) {
  for (let i = str.length - 1; i >= 0; i -= 1) {
    if (!isStrWhiteSpaceChar(str[i])) {
      return i + 1;
    }
  }
  return 0;
}
