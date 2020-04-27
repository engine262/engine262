import {
  Assert,
  Get,
  ToString,
  IsNonNegativeInteger,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';

// #sec-getsubstitution
export function GetSubstitution(matched, str, position, captures, namedCaptures, replacement) {
  // 1. Assert: Type(matched) is String.
  Assert(Type(matched) === 'String');
  // 2. Let matchLength be the number of code units in matched.
  const matchLength = matched.stringValue().length;
  // 3. Assert: Type(str) is String.
  Assert(Type(str) === 'String');
  // 4. Let stringLength be the number of code units in str.
  const stringLength = str.stringValue().length;
  // 5. Assert: ! IsNonNegativeInteger(position) is true.
  Assert(X(IsNonNegativeInteger(position)) === Value.true);
  // 6. Assert: position ≤ stringLength.
  Assert(position.numberValue() <= stringLength);
  // 7. Assert: captures is a possibly empty List of Strings.
  Assert(Array.isArray(captures) && captures.every((value) => Type(value) === 'String' || Type(value) === 'Undefined'));
  // 8. Assert: Type(replacement) is String.
  Assert(Type(replacement) === 'String');
  // 9. Let tailPos be position + matchLength.
  const tailPos = position.numberValue() + matchLength;
  // 10. Let m be the number of elements in captures.
  const m = captures.length;
  // 11. Let result be the String value derived from replacement by copying code unit elements from replacement
  //     to result while performing replacements as specified in Table 52. These $ replacements are done left-to-right,
  //     and, once such a replacement is performed, the new replacement text is not subject to further replacements.
  const replacementStr = replacement.stringValue();
  let result = '';
  let i = 0;
  while (i < replacementStr.length) {
    const currentChar = replacementStr[i];
    if (currentChar === '$' && i < replacementStr.length - 1) {
      const nextChar = replacementStr[i + 1];
      if (nextChar === '$') {
        result += '$';
        i += 2;
      } else if (nextChar === '&') {
        result += matched.stringValue();
        i += 2;
      } else if (nextChar === '`') {
        if (position.numberValue() === 0) {
          // Replacement is the empty String
        } else {
          result += str.stringValue().substring(0, position.numberValue());
        }
        i += 2;
      } else if (nextChar === '\'') {
        if (tailPos >= stringLength) {
          // Replacement is the empty String
        } else {
          result += str.stringValue().substring(tailPos);
        }
        i += 2;
      } else if ('123456789'.includes(nextChar) && (i === replacementStr.length - 2 || !'0123456789'.includes(replacementStr[i + 2]))) {
        const n = Number(nextChar);
        if (n <= m) {
          const capture = captures[n - 1];
          if (capture !== Value.undefined) {
            result += capture.stringValue();
          }
        } else {
          result += `$${nextChar}`;
        }
        i += 2;
      } else if (i < replacementStr.length - 2 && '0123456789'.includes(nextChar) && '0123456789'.includes(replacementStr[i + 2])) {
        const nextNextChar = replacementStr[i + 2];
        const n = Number(nextChar + nextNextChar);
        if (n !== 0 && n <= m) {
          const capture = captures[n - 1];
          if (capture !== Value.undefined) {
            result += capture.stringValue();
          }
        } else {
          result += `$${nextChar}${nextNextChar}`;
        }
        i += 3;
      } else if (nextChar === '<') {
        if (namedCaptures === Value.undefined) {
          result += '$<';
          i += 2;
        } else {
          Assert(Type(namedCaptures) === 'Object');
          const nextSign = replacementStr.indexOf('>', i);
          if (nextSign === -1) {
            result += '$<';
            i += 2;
          } else {
            const groupName = new Value(replacementStr.substring(i + 2, nextSign));
            const capture = Q(Get(namedCaptures, groupName));
            if (capture === Value.undefined) {
              // Replace the text with the empty string
            } else {
              result += Q(ToString(capture)).stringValue();
            }
            i = nextSign + 1;
          }
        }
      } else {
        result += '$';
        i += 1;
      }
    } else {
      result += currentChar;
      i += 1;
    }
  }
  // 12. Return result.
  return new Value(result);
}
