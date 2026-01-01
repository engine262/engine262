import type {
  NormalCompletion, PlainCompletion, ThrowCompletion, YieldCompletion,
} from './completion.mts';
import { surroundingAgent } from './host-defined/engine.mts';
import { OutOfRange } from './helpers.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import {
  Evaluate_Script,
  Evaluate_ScriptBody,
  Evaluate_Module,
  Evaluate_ModuleBody,
  Evaluate_ImportDeclaration,
  Evaluate_ExportDeclaration,
  Evaluate_ClassDeclaration,
  Evaluate_LexicalDeclaration,
  Evaluate_FunctionDeclaration,
  Evaluate_HoistableDeclaration,
  Evaluate_Block,
  Evaluate_VariableStatement,
  Evaluate_ExpressionStatement,
  Evaluate_EmptyStatement,
  Evaluate_IfStatement,
  Evaluate_ReturnStatement,
  Evaluate_TryStatement,
  Evaluate_ThrowStatement,
  Evaluate_DebuggerStatement,
  Evaluate_BreakableStatement,
  Evaluate_LabelledStatement,
  Evaluate_ForBinding,
  Evaluate_CaseClause,
  Evaluate_BreakStatement,
  Evaluate_ContinueStatement,
  Evaluate_WithStatement,
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
  Evaluate_ExponentiationExpression,
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
  Evaluate_OptionalExpression,
  Evaluate_TaggedTemplateExpression,
  Evaluate_SuperCall,
  Evaluate_SuperProperty,
  Evaluate_NewTarget,
  Evaluate_ImportMeta,
  Evaluate_ImportCall,
  Evaluate_AwaitExpression,
  Evaluate_YieldExpression,
  Evaluate_ParenthesizedExpression,
  Evaluate_AssignmentExpression,
  Evaluate_UnaryExpression,
  Evaluate_ArrowFunction,
  Evaluate_AsyncArrowFunction,
  Evaluate_ConditionalExpression,
  Evaluate_RegularExpressionLiteral,
  Evaluate_AnyFunctionBody,
  Evaluate_ExpressionBody,
} from './runtime-semantics/all.mts';
import { avoid_using_children } from './parser/utils.mts';
import {
  type AbruptCompletion, Assert, type ReferenceRecord, type ReturnCompletion, Value,
  type ValueCompletion,
} from '#self';

export type Evaluator<Result> = Generator<EvaluatorYieldType, Result, EvaluatorNextType>;
export type PlainEvaluator<V = void> = Evaluator<PlainCompletion<V>>;
export type ValueEvaluator<V extends Value = Value> = Evaluator<ValueCompletion<V>>;
export type ExpressionEvaluator = Evaluator<PlainCompletion<ReferenceRecord | Value>>;
export type StatementEvaluator = Evaluator<PlainCompletion<void | Value> | AbruptCompletion>;
export type ReferenceEvaluator = Evaluator<PlainCompletion<ReferenceRecord>>;
export type YieldEvaluator = Evaluator<YieldCompletion | Value>;
export type AsyncBuiltinSteps = () => Evaluator<Value | NormalCompletion<Value> | ThrowCompletion | ReturnCompletion>;
export type ExpressionThatEvaluatedToReferenceRecord = ParseNode.IdentifierReference;

export function Evaluate(node: ExpressionThatEvaluatedToReferenceRecord): ReferenceEvaluator
export function Evaluate(node: ParseNode.Module | ParseNode.ScriptBody): ValueEvaluator
export function Evaluate(node: ParseNode.Expression): ExpressionEvaluator
export function Evaluate(node: ParseNode): StatementEvaluator
export function* Evaluate(node: ParseNode): Evaluator<unknown> {
  surroundingAgent.runningExecutionContext.callSite.setLocation(node);

  if (surroundingAgent.hostDefinedOptions.onNodeEvaluation) {
    surroundingAgent.hostDefinedOptions.onNodeEvaluation(node, surroundingAgent.currentRealmRecord);
  }
  if (surroundingAgent.hostDefinedOptions.onDebugger) {
    const resumption = yield { type: 'potential-debugger' };
    Assert(resumption.type === 'debugger-resume');
  }

  switch (node.type) {
    // Language
    case 'Script':
      return yield* Evaluate_Script(node);
    case 'ScriptBody':
      return yield* Evaluate_ScriptBody(node);
    case 'Module':
      return yield* Evaluate_Module(node);
    case 'ModuleBody':
      return yield* Evaluate_ModuleBody(node);
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
    case 'ForOfStatement':
    case 'ForAwaitStatement':
      return yield* Evaluate_BreakableStatement(node);
    case 'ForBinding':
      return yield* Evaluate_ForBinding(node);
    case 'CaseClause':
    case 'DefaultClause':
      return yield* Evaluate_CaseClause(node);
    case 'BreakStatement':
      return Evaluate_BreakStatement(node);
    case 'ContinueStatement':
      return Evaluate_ContinueStatement(node);
    case 'LabelledStatement':
      return yield* Evaluate_LabelledStatement(node);
    case 'ReturnStatement':
      return yield* Evaluate_ReturnStatement(node);
    case 'ThrowStatement':
      return yield* Evaluate_ThrowStatement(node);
    case 'TryStatement':
      return yield* Evaluate_TryStatement(node);
    case 'DebuggerStatement':
      return yield* Evaluate_DebuggerStatement(node);
    case 'WithStatement':
      return yield* Evaluate_WithStatement(node);
    // Declarations
    case 'ImportDeclaration':
      return Evaluate_ImportDeclaration(node);
    case 'ExportDeclaration':
      return yield* Evaluate_ExportDeclaration(node);
    case 'ClassDeclaration':
      return yield* Evaluate_ClassDeclaration(node);
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
      return yield* Evaluate_IdentifierReference(node);
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
    case 'ExponentiationExpression':
      return yield* Evaluate_ExponentiationExpression(node);
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
    case 'CallExpression': {
      surroundingAgent.runningExecutionContext.callSite.setCallLocation(node);
      const r = yield* Evaluate_CallExpression(node);
      const resumption = yield { type: 'potential-debugger' };
      Assert(resumption.type === 'debugger-resume');
      surroundingAgent.runningExecutionContext.callSite.setCallLocation(null);
      return r;
    }
    case 'NewExpression':
      return yield* Evaluate_NewExpression(node);
    case 'MemberExpression':
      return yield* Evaluate_MemberExpression(node);
    case 'OptionalExpression':
      return yield* Evaluate_OptionalExpression(node);
    case 'TaggedTemplateExpression':
      return yield* Evaluate_TaggedTemplateExpression(node);
    case 'SuperProperty':
      return yield* Evaluate_SuperProperty(node);
    case 'SuperCall':
      return yield* Evaluate_SuperCall(node);
    case 'NewTarget':
      return Evaluate_NewTarget();
    case 'ImportMeta':
      return Evaluate_ImportMeta(node);
    case 'ImportCall':
      return yield* Evaluate_ImportCall(node);
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
    case 'AsyncArrowFunction':
      return Evaluate_AsyncArrowFunction(node);
    case 'ConditionalExpression':
      return yield* Evaluate_ConditionalExpression(node);
    case 'RegularExpressionLiteral':
      return yield* Evaluate_RegularExpressionLiteral(node);
    case 'AsyncBody':
    case 'GeneratorBody':
    case 'AsyncGeneratorBody':
      return yield* Evaluate_AnyFunctionBody(node);
    case 'ExpressionBody':
      return yield* Evaluate_ExpressionBody(node);
    default:
      throw new OutOfRange('Evaluate', node);
  }
}

export type EvaluatorYieldType =
  | { type: 'debugger' }
  | { type: 'potential-debugger' }
  | { type: 'await' }
  | { type: 'yield', value: Value }
  | { type: 'async-generator-yield' }

export type EvaluatorNextType = {
  type: 'debugger-resume',
  value: ValueCompletion | undefined
} | {
  type: 'await-resume',
  value: ValueCompletion
} | {
  type: 'generator-resume',
  value: ValueCompletion | ReturnCompletion
} | {
  type: 'async-generator-resume',
  value: ValueCompletion | ReturnCompletion
}

export interface BreakpointLocation {
  scriptId: string;
  lineNumber: number;
  columnNumber?: number;
}

export function getBreakpointCandidates(from: BreakpointLocation, to?: BreakpointLocation, _restrictToFunction = false): BreakpointLocation[] {
  const scriptId = from.scriptId;
  const script = surroundingAgent.parsedSources.get(scriptId);
  if (!script || (to && scriptId !== to.scriptId)) {
    return [];
  }
  const node = script.ECMAScriptCode;
  if (!('type' in node)) {
    return [];
  }
  const nodes = [...yieldAllNodesIntersectWithRange(node, from, to)];
  return nodes.map((node): BreakpointLocation => ({ scriptId, lineNumber: node.location.start.line - 1, columnNumber: node.location.start.column - 1 }));
}

function* yieldAllNodesIntersectWithRange(node: ParseNode, from: BreakpointLocation, to: BreakpointLocation | undefined): Generator<ParseNode> {
  const fromLine = from.lineNumber + 1;
  const fromColumn = from.columnNumber !== undefined ? from.columnNumber + 1 : undefined;
  const toLine = to ? to.lineNumber + 1 : fromLine;
  const toColumn = to?.columnNumber !== undefined ? to.columnNumber + 1 : undefined;
  if (node.location.end.line < fromLine) {
    return;
  }
  if (fromColumn && node.location.end.line === fromLine && node.location.end.column < fromColumn) {
    return;
  }
  if (toLine) {
    if (node.location.start.line > toLine) {
      return;
    }
    if (toColumn && node.location.start.line === toLine && node.location.start.column > toColumn) {
      return;
    }
  }
  // only yield the current node iff strictly in the range
  if (
    node.location.start.line >= fromLine
    && (fromColumn ? node.location.start.column >= fromColumn : true)
    && (toLine ? node.location.end.line <= toLine && (toColumn ? node.location.end.column <= toColumn : true) : true)
  ) {
    yield node;
  }
  for (const child of avoid_using_children(node)) {
    yield* yieldAllNodesIntersectWithRange(child, from, to);
  }
}
