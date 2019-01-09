import nearley from 'nearley';
import { Assert } from '../abstract-ops/all.mjs';
import { searchNotStrWhiteSpaceChar, reverseSearchNotStrWhiteSpaceChar } from '../grammar/numeric-string.mjs';
import grammar from '../grammar/StrNumericLiteral-gen.mjs';

const { ParserRules } = grammar;

const StrNumericLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'StrNumericLiteral',
});

const StrDecimalLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'StrDecimalLiteral',
});

export function MV_StringNumericLiteral(StringNumericLiteral) {
  if (StringNumericLiteral === '') {
    // StringNumericLiteral ::: [empty]
    return 0;
  }

  const leadingWhitespaceStripped = StringNumericLiteral.slice(searchNotStrWhiteSpaceChar(StringNumericLiteral));

  if (leadingWhitespaceStripped === '') {
    // StringNumericLiteral ::: StrWhiteSpace
    return 0;
  }

  // StringNumericLiteral ::: StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
  const StrNumericLiteral = leadingWhitespaceStripped.slice(0, reverseSearchNotStrWhiteSpaceChar(leadingWhitespaceStripped));
  return MV_StrNumericLiteral(StrNumericLiteral);
}

function MV_StrNumericLiteral(StrNumericLiteral) {
  const parser = new nearley.Parser(StrNumericLiteralGrammar);
  try {
    parser.feed(StrNumericLiteral);
  } catch (err) {
    return NaN;
  }
  Assert(parser.results.length === 1);
  return parser.results[0].toNumber();
}

export function MV_StrDecimalLiteral(StrDecimalLiteral, prefixOk = false) {
  const parser = new nearley.Parser(StrDecimalLiteralGrammar, { keepHistory: prefixOk });
  try {
    parser.feed(StrDecimalLiteral);
  } catch (err) {
    if (!prefixOk) {
      return NaN;
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
      return NaN;
    }
  }
  Assert(parser.results.length === 1);
  return parser.results[0].toNumber();
}
