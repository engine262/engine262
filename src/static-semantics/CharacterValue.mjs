import { OutOfRange } from '../helpers.mjs';

export function CharacterValue(node) {
  switch (node.type) {
    case 'CharacterEscape':
      switch (true) {
        case !!node.ControlEscape:
          switch (node.ControlEscape) {
            case 't':
              return '\u{0009}';
            case 'n':
              return '\u{000A}';
            case 'v':
              return '\u{000B}';
            case 'f':
              return '\u{000C}';
            case 'r':
              return '\u{000D}';
            default:
              throw new OutOfRange('Evaluate_CharacterEscape', node);
          }
        case !!node.ControlLetter: {
          // 1. Let ch be the code point matched by ControlLetter.
          const ch = node.ControlLetter;
          // 2. Let i be ch's code point value.
          const i = ch.codePointAt(0);
          // 3. Return the remainder of dividing i by 32.
          return String.fromCharCode(i % 32);
        }
        case !!node.HexEscapeSequence:
          // 1. Return the numeric value of the code unit that is the SV of HexEscapeSequence.
          return String.fromCharCode(Number.parseInt(`${node.HexEscapeSequence.HexDigit_a}${node.HexEscapeSequence.HexDigit_b}`, 16));
        case !!node.RegExpUnicodeEscapeSequence:
          return CharacterValue(node.RegExpUnicodeEscapeSequence);
        case node.subtype === '0':
          // 1. Return the code point value of U+0000 (NULL).
          return '\u{0000}';
        case !!node.IdentityEscape:
          // 1. Let ch be the code point matched by IdentityEscape.
          // 2. Return the code point value of ch.
          return node.IdentityEscape;
        default:
          throw new OutOfRange('Evaluate_CharacterEscape', node);
      }
    case 'RegExpUnicodeEscapeSequence': {
      const {
        Hex4Digits: {
          HexDigit_a,
          HexDigit_b,
          HexDigit_c,
          HexDigit_d,
        },
      } = node;
      const chars = `${HexDigit_a}${HexDigit_b}${HexDigit_c}${HexDigit_d}`;
      return String.fromCharCode(Number.parseInt(chars, 16));
    }
    default:
      throw new OutOfRange('CharacterValue', node);
  }
}
