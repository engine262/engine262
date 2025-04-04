import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { UTF16SurrogatePairToCodePoint } from './all.mts';

export function CharacterValue(node: ParseNode.RegExp.CharacterEscape | ParseNode.RegExp.RegExpUnicodeEscapeSequence | ParseNode.RegExp.ClassAtom | ParseNode.RegExp.ClassEscape): number {
  switch (node.type) {
    case 'CharacterEscape':
      switch (true) {
        case !!node.ControlEscape:
          switch (node.ControlEscape) {
            case 't':
              return 0x0009;
            case 'n':
              return 0x000A;
            case 'v':
              return 0x000B;
            case 'f':
              return 0x000C;
            case 'r':
              return 0x000D;
            default:
              throw new OutOfRange('Evaluate_CharacterEscape', node);
          }
        case !!node.ControlLetter: {
          // 1. Let ch be the code point matched by ControlLetter.
          const ch = node.ControlLetter!;
          // 2. Let i be ch's code point value.
          const i = ch.codePointAt(0)!;
          // 3. Return the remainder of dividing i by 32.
          return i % 32;
        }
        case !!node.HexEscapeSequence:
          // 1. Return the numeric value of the code unit that is the SV of HexEscapeSequence.
          return Number.parseInt(`${node.HexEscapeSequence!.HexDigit_a}${node.HexEscapeSequence!.HexDigit_b}`, 16);
        case !!node.RegExpUnicodeEscapeSequence:
          return CharacterValue(node.RegExpUnicodeEscapeSequence!);
        case node.subtype === '0':
          // 1. Return the code point value of U+0000 (NULL).
          return 0x0000;
        case !!node.IdentityEscape: {
          // 1. Let ch be the code point matched by IdentityEscape.
          const ch = node.IdentityEscape!.codePointAt(0)!;
          // 2. Return the code point value of ch.
          return ch;
        }
        default:
          throw new OutOfRange('Evaluate_CharacterEscape', node);
      }
    case 'RegExpUnicodeEscapeSequence':
      switch (true) {
        case 'Hex4Digits' in node:
          return node.Hex4Digits!;
        case 'CodePoint' in node:
          return node.CodePoint!;
        case 'HexTrailSurrogate' in node:
          return UTF16SurrogatePairToCodePoint(node.HexLeadSurrogate!, node.HexTrailSurrogate!);
        case 'HexLeadSurrogate' in node:
          return node.HexLeadSurrogate!;
        default:
          throw new OutOfRange('Evaluate_CharacterEscape', node);
      }
    case 'ClassAtom':
      switch (true) {
        case node.value === '-':
          // 1. Return the code point value of U+002D (HYPHEN-MINUS).
          return 0x002D;
        case !!node.SourceCharacter: {
          // 1. Let ch be the code point matched by SourceCharacter.
          const ch = node.SourceCharacter!.codePointAt(0)!;
          // 2. Return ch.
          return ch;
        }
        default:
          throw new OutOfRange('CharacterValue', node);
      }
    case 'ClassEscape':
      switch (true) {
        case node.value === 'b':
          // 1. Return the code point value of U+0008 (BACKSPACE).
          return 0x0008;
        case node.value === '-':
          // 1. Return the code point value of U+002D (HYPHEN-MINUS).
          return 0x002D;
        case !!node.CharacterEscape:
          return CharacterValue(node.CharacterEscape!);
        default:
          throw new OutOfRange('CharacterValue', node);
      }
    default:
      throw new OutOfRange('CharacterValue', node);
  }
}
