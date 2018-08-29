import { isFunctionDeclaration } from '../ast.mjs';

// #sec-function-definitions-static-semantics-isfunctiondefinition
// FunctionExpression : function Binding Identifier ( FormalParameters ) { FunctionBody }
export function IsFunctionDefinition(expr) {
  return isFunctionDeclaration(expr);
}
