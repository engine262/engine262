import { surroundingAgent } from './engine.mjs';
import { OutOfRange } from './helpers.mjs';
import {
  Evaluate_IdentifierReference,
  Evaluate_This,
  Evaluate_Literal,
  Evaluate_ClassExpression,
  Evaluate_AdditiveExpression,
  Evaluate_MultiplicativeExpression,
  Evaluate_UpdateExpression,
  Evaluate_CoalesceExpression,
  Evaluate_IfStatement,
  Evaluate_Script,
  Evaluate_ScriptBody,
  Evaluate_ExpressionStatement,
} from './runtime-semantics/all.mjs';

export function* Evaluate(node) {
  surroundingAgent.runningExecutionContext.callSite.setLocation(node);

  if (surroundingAgent.hostDefinedOptions.onNodeEvaluation) {
    surroundingAgent.hostDefinedOptions.onNodeEvaluation(node, surroundingAgent.currentRealmRecord);
  }

  switch (node.type) {
    case 'Script':
      return yield* Evaluate_Script(node);
    case 'ScriptBody':
      return yield* Evaluate_ScriptBody(node);
    case 'ExpressionStatement':
      return yield* Evaluate_ExpressionStatement(node);
    case 'IdentifierReference':
      return Evaluate_IdentifierReference(node);
    case 'ThisExpression':
      return Evaluate_This(node);
    case 'NullLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
    case 'StringLiteral':
      return Evaluate_Literal(node);
    case 'ClassExpression':
      return yield* Evaluate_ClassExpression(node);
    case 'AdditiveExpression':
      return yield* Evaluate_AdditiveExpression(node);
    case 'MultiplicativeExpression':
      return yield* Evaluate_MultiplicativeExpression(node);
    case 'UpdateExpression':
      return yield* Evaluate_UpdateExpression(node);
    case 'CoalesceExpression':
      return yield* Evaluate_CoalesceExpression(node);
    case 'IfStatement':
      return yield* Evaluate_IfStatement(node);
    default:
      throw new OutOfRange('Evaluate', node);
  }
}
