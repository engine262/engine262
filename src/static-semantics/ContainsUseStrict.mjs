import {
  directivePrologueContainsUseStrictDirective,
  isBlockStatement,
  isExpression,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-function-definitions-static-semantics-containsusestrict
//   FunctionBody : FunctionStatementList
export function ContainsUseStrict_FunctionBody(FunctionBody) {
  return directivePrologueContainsUseStrictDirective(FunctionBody);
}

// #sec-arrow-function-definitions-static-semantics-containsusestrict
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function ContainsUseStrict_ConciseBody(ConciseBody) {
  switch (true) {
    case isExpression(ConciseBody):
      return false;
    case isBlockStatement(ConciseBody):
      return ContainsUseStrict_FunctionBody(ConciseBody.body);
    default:
      throw new OutOfRange('ContainsUseStrict_ConciseBody', ConciseBody);
  }
}
