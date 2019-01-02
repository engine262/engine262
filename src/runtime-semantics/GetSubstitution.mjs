import {
  Assert,
  Get,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q } from '../completion.mjs';

// 21.1.3.16.1 #sec-getsubstitution
export function GetSubstitution(matched, str, position, captures, namedCaptures, replacement) {
  Assert(Type(matched) === 'String');
  const matchLength = matched.stringValue().length;
  Assert(Type(str) === 'String');
  const stringLength = str.stringValue().length;
  Assert(Type(position) === 'Number' && Number.isInteger(position.numberValue()) && position.numberValue() >= 0);
  Assert(position.numberValue() <= stringLength);
  Assert(Array.isArray(captures) && captures.every((value) => Type(value) === 'String'));
  Assert(Type(replacement) === 'String');
  const tailPos = position.numberValue() + matchLength;
  const m = captures.length;
  if (namedCaptures !== Value.undefined) {
    namedCaptures = Q(ToObject(namedCaptures));
  }
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
          const nextSign = replacementStr.indexOf('>', i);
          if (nextSign === -1) {
            result += '$<';
            i += 2;
          } else {
            const groupName = new Value(replacementStr.substring(i + 1, nextSign));
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
  return new Value(result);
}
