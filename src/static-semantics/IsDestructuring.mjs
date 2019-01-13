import { Assert } from '../abstract-ops/notational-conventions.mjs';
import {
  isBindingIdentifier,
  isBindingPattern,
  isExpression,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.3.1.4 #sec-static-semantics-static-semantics-isdestructuring
//   MemberExpression :
//     PrimaryExpression
//     MemberExpression `[` Expression `]`
//     MemberExpression `.` IdentifierName
//     MemberExpression TemplateLiteral
//     SuperProperty
//     MetaProperty
//     `new` MemberExpression Arguments
//
//   NewExpression : `new` NewExpression
//
//   LeftHandSideExpression : CallExpression
//
// (implicit)
//   NewExpression : MemberExpression
//
//   LeftHandSideExpression : NewExpression
export function IsDestructuring_LeftHandSideExpression(LeftHandSideExpression) {
  switch (true) {
    case isExpression(LeftHandSideExpression):
      Assert(!isBindingPattern(LeftHandSideExpression));
      return false;

    case isBindingPattern(LeftHandSideExpression):
      return true;

    default:
      throw new OutOfRange('IsDestructuring_LeftHandSideExpression', LeftHandSideExpression);
  }
}

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
    default:
      throw new OutOfRange('IsDestructuring_ForBinding', ForBinding);
  }
}
