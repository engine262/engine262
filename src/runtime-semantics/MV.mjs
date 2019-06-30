import nearley from 'nearley';
import { Assert } from '../abstract-ops/all.mjs';
import { searchNotStrWhiteSpaceChar, reverseSearchNotStrWhiteSpaceChar } from '../grammar/numeric-string.mjs';
import grammar from '../grammar/StrNumericLiteral-gen.mjs';
import { Value } from '../value.mjs';

const { ParserRules } = grammar;

const StrNumericLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'StrNumericLiteral',
});

const StrDecimalLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'StrDecimalLiteral',
});

// 7.1.3.1.1 #sec-runtime-semantics-mv-s
// Once the exact MV for a String numeric literal has been determined, it is
// then rounded to a value of the Number type. If the MV is 0, then the rounded
// value is +0 unless the first non white space code point in the String
// numeric literal is "-", in which case the rounded value is -0. Otherwise,
// the rounded value must be the Number value for the MV…
function convertScientificMVToNumber(scientific, strWithoutWhitespace) {
  const prelimMV = scientific.toNumber();
  if (prelimMV === 0) {
    if (strWithoutWhitespace[0] === '-') {
      return new Value(-0);
    } else {
      return new Value(+0);
    }
  }
  return new Value(prelimMV);
}

// 7.1.3.1.1 #sec-runtime-semantics-mv-s
//   StringNumericLiteral :::
//     [empty]
//     StrWhiteSpace
//     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
export function MV_StringNumericLiteral(StringNumericLiteral) {
  if (StringNumericLiteral === '') {
    // StringNumericLiteral ::: [empty]
    return new Value(0);
  }

  const leadingWhitespaceStripped = StringNumericLiteral.slice(searchNotStrWhiteSpaceChar(StringNumericLiteral));

  if (leadingWhitespaceStripped === '') {
    // StringNumericLiteral ::: StrWhiteSpace
    return new Value(0);
  }

  // StringNumericLiteral ::: StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
  const StrNumericLiteral = leadingWhitespaceStripped.slice(0, reverseSearchNotStrWhiteSpaceChar(leadingWhitespaceStripped));
  return MV_StrNumericLiteral(StrNumericLiteral);
}

// 7.1.3.1.1 #sec-runtime-semantics-mv-s
//   StrNumericLiteral :::
//     StrDecimalLiteral
//     BinaryIntegerLiteral
//     OctalIntegerLiteral
//     HexIntegerLiteral
function MV_StrNumericLiteral(StrNumericLiteral) {
  const parser = new nearley.Parser(StrNumericLiteralGrammar);
  try {
    parser.feed(StrNumericLiteral);
  } catch (err) {
    return new Value(NaN);
  }
  if (parser.results.length === 0) {
    return new Value(NaN);
  }
  Assert(parser.results.length === 1);
  return convertScientificMVToNumber(parser.results[0], StrNumericLiteral);
}

// 7.1.3.1.1 #sec-runtime-semantics-mv-s
//   StrDecimalLiteral :::
//     StrUnsignedDecimalLiteral
//     `+` StrUnsignedDecimalLiteral
//     `-` StrUnsignedDecimalLiteral
export function MV_StrDecimalLiteral(StrDecimalLiteral, prefixOk = false) {
  const parser = new nearley.Parser(StrDecimalLiteralGrammar, { keepHistory: prefixOk });
  try {
    parser.feed(StrDecimalLiteral);
  } catch (err) {
    if (!prefixOk) {
      return new Value(NaN);
    }
  }
  if (prefixOk) {
    // Backtrack until we find a prefix of StrDecimalLiteral that is indeed a
    // StrDecimalLiteral.
    while (parser.table[parser.current]) {
      parser.restore(parser.table[parser.current]);
      if (parser.results.length !== 0) {
        break;
      }
      parser.current -= 1;
    }
    if (parser.results.length === 0) {
      return new Value(NaN);
    }
  }
  Assert(parser.results.length === 1);
  return convertScientificMVToNumber(parser.results[0], StrDecimalLiteral);
}
