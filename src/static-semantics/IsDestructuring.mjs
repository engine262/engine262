import { OutOfRange } from '../helpers.mjs';
import {
  isBindingIdentifier,
  isBindingPattern,
  isActualMemberExpression,
  isPrimaryExpression,
} from '../ast.mjs';

// 13.7.5.6 #sec-for-in-and-for-of-statements-static-semantics-isdestructuring
//   ForDeclaration : LetOrConst ForBinding
export function IsDestructuring_ForDeclaration(ForDeclaration) {
  return IsDestructuring_ForBinding(ForDeclaration.declarations[0].id);
}

// 13.7.5.6 #sec-for-in-and-for-of-statements-static-semantics-isdestructuring
//   ForBinding :
//     BindingIdentifier
//     BindingPattern
export function IsDestructuring_ForBinding(ForBinding) {
  switch (true) {
    case isBindingIdentifier(ForBinding):
      return false;
    case isBindingPattern(ForBinding):
      return true;
    case isActualMemberExpression(ForBinding):
      return false;
    case isPrimaryExpression(ForBinding):
      return false;
    default:
      throw new OutOfRange('IsDestructuring_ForBinding', ForBinding);
  }
}
