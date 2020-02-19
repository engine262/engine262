import { surroundingAgent } from './engine.mjs';
import { OutOfRange } from './helpers.mjs';
import {
  Evaluate_Script,
  Evaluate_ScriptBody,
  Evaluate_Block,
  Evaluate_LexicalDeclaration,
  Evaluate_FunctionDeclaration,
  Evaluate_HoistableDeclaration,
  Evaluate_VariableStatement,
  Evaluate_ExpressionStatement,
  Evaluate_EmptyStatement,
  Evaluate_IfStatement,
  Evaluate_ReturnStatement,
  Evaluate_TryStatement,
  Evaluate_ThrowStatement,
  Evaluate_BreakableStatement,
  Evaluate_BreakStatement,
  Evaluate_IdentifierReference,
  Evaluate_CommaOperator,
  Evaluate_This,
  Evaluate_Literal,
  Evaluate_ArrayLiteral,
  Evaluate_ObjectLiteral,
  Evaluate_TemplateLiteral,
  Evaluate_ClassExpression,
  Evaluate_FunctionExpression,
  Evaluate_GeneratorExpression,
  Evaluate_AsyncFunctionExpression,
  Evaluate_AsyncGeneratorExpression,
  Evaluate_AdditiveExpression,
  Evaluate_MultiplicativeExpression,
  Evaluate_UpdateExpression,
  Evaluate_ShiftExpression,
  Evaluate_LogicalORExpression,
  Evaluate_LogicalANDExpression,
  Evaluate_BinaryBitwiseExpression,
  Evaluate_RelationalExpression,
  Evaluate_CoalesceExpression,
  Evaluate_EqualityExpression,
  Evaluate_CallExpression,
  Evaluate_NewExpression,
  Evaluate_MemberExpression,
  Evaluate_SuperCall,
  Evaluate_SuperProperty,
  Evaluate_NewTarget,
  Evaluate_AwaitExpression,
  Evaluate_YieldExpression,
  Evaluate_ParenthesizedExpression,
  Evaluate_AssignmentExpression,
  Evaluate_UnaryExpression,
  Evaluate_ArrowFunction,
  Evaluate_ConditionalExpression,
  Evaluate_RegularExpressionLiteral,
  Evaluate_AnyFunctionBody,
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
    // Statements
    case 'Block':
      return yield* Evaluate_Block(node);
    case 'VariableStatement':
      return yield* Evaluate_VariableStatement(node);
    case 'EmptyStatement':
      return Evaluate_EmptyStatement(node);
    case 'IfStatement':
      return yield* Evaluate_IfStatement(node);
    case 'ExpressionStatement':
      return yield* Evaluate_ExpressionStatement(node);
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'SwitchStatement':
    case 'ForStatement':
    case 'ForInStatement':
      return yield* Evaluate_BreakableStatement(node);
    case 'BreakStatement':
      return Evaluate_BreakStatement(node);
    case 'ReturnStatement':
      return yield* Evaluate_ReturnStatement(node);
    case 'ThrowStatement':
      return yield* Evaluate_ThrowStatement(node);
    case 'TryStatement':
      return yield* Evaluate_TryStatement(node);
    // Declarations
    case 'LexicalDeclaration':
      return yield* Evaluate_LexicalDeclaration(node);
    case 'FunctionDeclaration':
      return Evaluate_FunctionDeclaration(node);
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return Evaluate_HoistableDeclaration(node);
    // Expressions
    case 'CommaOperator':
      return yield* Evaluate_CommaOperator(node);
    case 'ThisExpression':
      return Evaluate_This(node);
    case 'IdentifierReference':
      return Evaluate_IdentifierReference(node);
    case 'NullLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
      return Evaluate_Literal(node);
    case 'ArrayLiteral':
      return yield* Evaluate_ArrayLiteral(node);
    case 'ObjectLiteral':
      return yield* Evaluate_ObjectLiteral(node);
    case 'FunctionExpression':
      return Evaluate_FunctionExpression(node);
    case 'ClassExpression':
      return yield* Evaluate_ClassExpression(node);
    case 'GeneratorExpression':
      return Evaluate_GeneratorExpression(node);
    case 'AsyncFunctionExpression':
      return Evaluate_AsyncFunctionExpression(node);
    case 'AsyncGeneratorExpression':
      return Evaluate_AsyncGeneratorExpression(node);
    case 'TemplateLiteral':
      return yield* Evaluate_TemplateLiteral(node);
    case 'ParenthesizedExpression':
      return yield* Evaluate_ParenthesizedExpression(node);
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
    case 'BitwiseANDExpression':
    case 'BitwiseXORExpression':
    case 'BitwiseORExpression':
      return yield* Evaluate_BinaryBitwiseExpression(node);
    case 'RelationalExpression':
      return yield* Evaluate_RelationalExpression(node);
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
    case 'NewTarget':
      return Evaluate_NewTarget(node);
    case 'AssignmentExpression':
      return yield* Evaluate_AssignmentExpression(node);
    case 'YieldExpression':
      return yield* Evaluate_YieldExpression(node);
    case 'AwaitExpression':
      return yield* Evaluate_AwaitExpression(node);
    case 'UnaryExpression':
      return yield* Evaluate_UnaryExpression(node);
    case 'ArrowFunction':
      return Evaluate_ArrowFunction(node);
    case 'ConditionalExpression':
      return yield* Evaluate_ConditionalExpression(node);
    case 'RegularExpressionLiteral':
      return yield* Evaluate_RegularExpressionLiteral(node);
    case 'AsyncFunctionBody':
    case 'GeneratorBody':
    case 'AsyncGeneratorBody':
      return yield* Evaluate_AnyFunctionBody(node);
    default:
      throw new OutOfRange('Evaluate', node);
  }
}
