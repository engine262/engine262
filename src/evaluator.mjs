import { surroundingAgent } from './engine.mjs';
import { OutOfRange } from './helpers.mjs';
import {
  Evaluate_Script,
  Evaluate_ScriptBody,
  Evaluate_Block,
  Evaluate_LexicalDeclaration,
  Evaluate_FunctionDeclaration,
  Evaluate_VariableStatement,
  Evaluate_IfStatement,
  Evaluate_ReturnStatement,
  Evaluate_TryStatement,
  Evaluate_ThrowStatement,
  Evaluate_ExpressionStatement,
  Evaluate_IdentifierReference,
  Evaluate_This,
  Evaluate_Literal,
  Evaluate_ArrayLiteral,
  Evaluate_ObjectLiteral,
  Evaluate_ClassExpression,
  Evaluate_FunctionExpression,
  Evaluate_AdditiveExpression,
  Evaluate_MultiplicativeExpression,
  Evaluate_UpdateExpression,
  Evaluate_ShiftExpression,
  Evaluate_LogicalORExpression,
  Evaluate_LogicalANDExpression,
  Evaluate_CoalesceExpression,
  Evaluate_EqualityExpression,
  Evaluate_CallExpression,
  Evaluate_NewExpression,
  Evaluate_MemberExpression,
  Evaluate_SuperCall,
  Evaluate_SuperProperty,
  Evaluate_ParenthesizedExpression,
  Evaluate_AssignmentExpression,
  Evaluate_UnaryExpression,
} from './runtime-semantics/all.mjs';

export function* Evaluate(node) {
  surroundingAgent.runningExecutionContext.callSite.setLocation(node);

  if (surroundingAgent.hostDefinedOptions.onNodeEvaluation) {
    surroundingAgent.hostDefinedOptions.onNodeEvaluation(node, surroundingAgent.currentRealmRecord);
  }

  switch (node.type) {
    // Language
    case 'Script':
      return yield* Evaluate_Script(node);
    case 'ScriptBody':
      return yield* Evaluate_ScriptBody(node);
    // Statements & Declarations
    case 'Block':
      return yield* Evaluate_Block(node);
    case 'LexicalDeclaration':
      return yield* Evaluate_LexicalDeclaration(node);
    case 'FunctionDeclaration':
      return Evaluate_FunctionDeclaration(node);
    case 'VariableStatement':
      return yield* Evaluate_VariableStatement(node);
    case 'IfStatement':
      return yield* Evaluate_IfStatement(node);
    case 'ExpressionStatement':
      return yield* Evaluate_ExpressionStatement(node);
    case 'ReturnStatement':
      return yield* Evaluate_ReturnStatement(node);
    case 'TryStatement':
      return yield* Evaluate_TryStatement(node);
    case 'ThrowStatement':
      return yield* Evaluate_ThrowStatement(node);
    // Expressions
    case 'IdentifierReference':
      return Evaluate_IdentifierReference(node);
    case 'ThisExpression':
      return Evaluate_This(node);
    case 'NullLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
      return Evaluate_Literal(node);
    case 'ArrayLiteral':
      return yield* Evaluate_ArrayLiteral(node);
    case 'ObjectLiteral':
      return yield* Evaluate_ObjectLiteral(node);
    case 'ClassExpression':
      return yield* Evaluate_ClassExpression(node);
    case 'FunctionExpression':
      return Evaluate_FunctionExpression(node);
    case 'AdditiveExpression':
      return yield* Evaluate_AdditiveExpression(node);
    case 'MultiplicativeExpression':
      return yield* Evaluate_MultiplicativeExpression(node);
    case 'UpdateExpression':
      return yield* Evaluate_UpdateExpression(node);
    case 'ShiftExpression':
      return yield* Evaluate_ShiftExpression(node);
    case 'LogicalORExpression':
      return yield* Evaluate_LogicalORExpression(node);
    case 'LogicalANDExpression':
      return yield* Evaluate_LogicalANDExpression(node);
    case 'CoalesceExpression':
      return yield* Evaluate_CoalesceExpression(node);
    case 'EqualityExpression':
      return yield* Evaluate_EqualityExpression(node);
    case 'CallExpression':
      return yield* Evaluate_CallExpression(node);
    case 'NewExpression':
      return yield* Evaluate_NewExpression(node);
    case 'MemberExpression':
      return yield* Evaluate_MemberExpression(node);
    case 'SuperProperty':
      return yield* Evaluate_SuperProperty(node);
    case 'SuperCall':
      return yield* Evaluate_SuperCall(node);
    case 'ParenthesizedExpression':
      return yield* Evaluate_ParenthesizedExpression(node);
    case 'AssignmentExpression':
      return yield* Evaluate_AssignmentExpression(node);
    case 'UnaryExpression':
      return yield* Evaluate_UnaryExpression(node);
    default:
      throw new OutOfRange('Evaluate', node);
  }
}
