import {
  ObjectValue, UndefinedValue, JSStringValue, Value,
} from '../value.mts';
import { Q } from '../completion.mts';
import type { ValueEvaluator } from '../evaluator.mts';
import {
  Assert,
  Get,
  ToString,
  surroundingAgent,
} from '#self';

/** https://tc39.es/ecma262/#sec-getsubstitution */
export function* GetSubstitution(matched: JSStringValue, str: JSStringValue, position: number, captures: readonly (JSStringValue | UndefinedValue)[], namedCaptures: UndefinedValue | ObjectValue, replacementTemplate: JSStringValue): ValueEvaluator<JSStringValue> {
  const stringLength = str.stringValue().length;
  Assert(position <= stringLength);
  const result: string[] = [];
  let templateRemainder = replacementTemplate.stringValue();
  let ref: string;
  let refReplacement: string;
  while (templateRemainder.length) {
    if (templateRemainder.startsWith('$$')) {
      ref = '$$';
      refReplacement = '$';
    } else if (templateRemainder.startsWith('$`')) {
      ref = '$`';
      refReplacement = str.stringValue().slice(0, position);
    } else if (templateRemainder.startsWith('$&')) {
      ref = '$&';
      refReplacement = matched.stringValue();
    } else if (templateRemainder.startsWith("$'")) {
      ref = "$'";
      const matchLength = matched.stringValue().length;
      const tailPos = position + matchLength;
      refReplacement = str.stringValue().slice(Math.min(tailPos, stringLength));
    } else if (templateRemainder.match(/^\$\d+/)) {
      let digitCount = templateRemainder.match(/^\$\d\d/) ? 2 : 1;
      let digits = templateRemainder.slice(1, 1 + digitCount);
      let index = parseInt(digits, 10);
      Assert(index >= 0 && index <= 99);
      const captureLen = captures.length;
      if (index > captureLen && digitCount === 2) {
        digitCount = 1;
        digits = digits[0];
        index = parseInt(digits, 10);
      }
      ref = templateRemainder.slice(0, 1 + digitCount);
      if (index >= 1 && index <= captureLen) {
        const capture = captures[index - 1];
        if (capture instanceof UndefinedValue) {
          refReplacement = '';
        } else {
          refReplacement = capture.stringValue();
        }
      } else {
        refReplacement = ref;
      }
    } else if (templateRemainder.startsWith('$<')) {
      const gtPos = templateRemainder.indexOf('>', 0);
      if (gtPos === -1 || namedCaptures instanceof UndefinedValue) {
        ref = '$<';
        refReplacement = ref;
      } else {
        ref = templateRemainder.slice(0, gtPos + 1);
        const groupName = templateRemainder.slice(2, gtPos);
        Assert(namedCaptures instanceof ObjectValue);
        const capture = Q(yield* Get(namedCaptures, Value(groupName)));
        if (capture instanceof UndefinedValue) {
          refReplacement = '';
        } else {
          refReplacement = (Q(yield* ToString(capture))).stringValue();
        }
      }
    } else {
      ref = templateRemainder[0];
      refReplacement = ref;
    }
    const refLength = ref.length;
    templateRemainder = templateRemainder.slice(refLength);
    result.push(refReplacement);
  }
  let result_str;
  try {
    result_str = result.join('');
  } catch (e) {
    // test262/test/staging/sm/String/replace-math.js
    return surroundingAgent.Throw('RangeError', 'OutOfRange', 'String too long');
  }
  return Value(result_str);
}
