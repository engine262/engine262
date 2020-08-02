import { OutOfRange } from '../helpers.mjs';

export function CharacterValue(node) {
  switch (node.type) {
    case 'CharacterEscape':
      if (node.ControlLetter) {
        // 1. Let ch be the code point matched by ControlLetter.
        const ch = node.ControlLetter;
        // 2. Let i be ch's code point value.
        const i = ch.codePointAt(0);
        // 3. Return the remainder of dividing i by 32.
        return String.fromCharCode(i % 32);
      }
      if (node.IdentityEscape) {
        return node.IdentityEscape;
      }
      throw new OutOfRange('CharacterValue', node);
    default:
      throw new OutOfRange('CharacterValue', node);
  }
}
