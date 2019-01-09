import nearley from 'nearley';
import { Assert } from '../abstract-ops/all.mjs';
import grammar from '../grammar/StrNumericLiteral-gen.mjs';

const { ParserRules } = grammar;

const NumericLiteralGrammar = nearley.Grammar.fromCompiled({
  ParserRules,
  ParserStart: 'NumericLiteral',
});

// 11.8.3.1 #sec-static-semantics-mv
//   NumericLiteral ::
//     DecimalLiteral
//     BinaryIntegerLiteral
//     OctalIntegerLiteral
//     HexIntegerLiteral
export function MV_NumericLiteral(NumericLiteral) {
  const parser = new nearley.Parser(NumericLiteralGrammar);
  try {
    parser.feed(NumericLiteral);
  } catch (err) {
    return NaN;
  }
  Assert(parser.results.length === 1);
  return parser.results[0].toNumber();
}
