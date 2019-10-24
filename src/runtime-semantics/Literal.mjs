import { OutOfRange } from '../helpers.mjs';
import { MV_NumericLiteral } from '../static-semantics/all.mjs';
import { Value } from '../value.mjs';

// 12.2.4.1 #sec-literals-runtime-semantics-evaluation
//   Literal : StringLiteral
//   Literal : BooleanLiteral
//   Literal : NumericLiteral
export function Evaluate_Literal(Literal) {
  switch (true) {
    case Literal.raw === 'null':
      return Value.null;

    case Literal.raw === 'true':
      return Value.true;

    case Literal.raw === 'false':
      return Value.false;

    case typeof Literal.value === 'number':
      return new Value(MV_NumericLiteral(Literal.raw));

    case typeof Literal.value === 'bigint':
      // TODO: Run MV parser on Literal.raw.
      return new Value(Literal.value);

    case typeof Literal.value === 'string':
      return new Value(Literal.value);

    default:
      throw new OutOfRange('Evaluate_Literal', Literal);
  }
}
