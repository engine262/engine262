import nearley from 'nearley';
import { Assert } from '../abstract-ops/all.mjs';
import { searchNotStrWhiteSpaceChar, reverseSearchNotStrWhiteSpaceChar } from '../grammar/numeric-string.mjs';
import grammar from '../grammar/StrNumericLiteral-gen.mjs';

const { ParserRules } = grammar;

const StrNumericLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'StrNumericLiteral',
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
