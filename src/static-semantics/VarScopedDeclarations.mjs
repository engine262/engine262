import {
  isBlockStatement,
  isBreakStatement,
  isContinueStatement,
  isDebuggerStatement,
  isDeclaration,
  isEmptyStatement,
  isExportDeclaration,
  isExportDeclarationWithVariable,
  isExpression,
  isExpressionStatement,
  isFunctionDeclaration,
  isIfStatement,
  isImportDeclaration,
  isIterationStatement,
  isLabelledStatement,
  isReturnStatement,
  isStatement,
  isSwitchStatement,
  isThrowStatement,
  isTryStatement,
  isVariableStatement,
  isWithStatement,
} from '../ast.mjs';
import {
  TopLevelVarScopedDeclarations_StatementList,
} from './TopLevelVarScopedDeclarations.mjs';

// 13.1.6 #sec-statement-semantics-static-semantics-varscopeddeclarations
//   Statement :
//     EmptyStatement
//     ExpressionStatement
//     ContinueStatement
//     BreakStatement
//     ReturnStatement
//     ThrowStatement
//     DebuggerStatement
//
// (implicit)
//   Statement :
//     BlockStatement
//     VariableStatement
//     IfStatement
//     BreakableStatement
//     WithStatement
//     LabelledStatement
//     TryStatement
//   BreakableStatement :
//     IterationStatement
//     SwitchStatement
export function VarScopedDeclarations_Statement(Statement) {
  switch (true) {
    case isEmptyStatement(Statement):
    case isExpressionStatement(Statement):
    case isContinueStatement(Statement):
    case isBreakStatement(Statement):
    case isReturnStatement(Statement):
    case isThrowStatement(Statement):
    case isDebuggerStatement(Statement):
      return [];

    case isBlockStatement(Statement):
      return VarScopedDeclarations_BlockStatement(Statement);
    case isVariableStatement(Statement):
      return VarScopedDeclarations_VariableStatement(Statement);
    case isIfStatement(Statement):
      return VarScopedDeclarations_IfStatement(Statement);
    case isWithStatement(Statement):
      return VarScopedDeclarations_WithStatement(Statement);
    case isLabelledStatement(Statement):
      return VarScopedDeclarations_LabelledStatement(Statement);
    case isTryStatement(Statement):
      return VarScopedDeclarations_TryStatement(Statement);
    case isIterationStatement(Statement):
      return VarScopedDeclarations_IterationStatement(Statement);
    case isSwitchStatement(Statement):
      return VarScopedDeclarations_SwitchStatement(Statement);

    default:
      throw new TypeError(`Invalid Statement: ${Statement.type}`);
  }
}

// 13.2.12 #sec-block-static-semantics-varscopeddeclarations
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function VarScopedDeclarations_StatementList(StatementList) {
  const declarations = [];
  for (const StatementListItem of StatementList) {
    declarations.push(...VarScopedDeclarations_StatementListItem(StatementListItem));
  }
  return declarations;
}

// 13.2.12 #sec-block-static-semantics-varscopeddeclarations
//   Block : `{` `}`
//
// (implicit)
//   Block : `{` StatementList `}`
export function VarScopedDeclarations_Block(Block) {
  return VarScopedDeclarations_StatementList(Block.body);
}

// (implicit)
//   BlockStatement : Block
export const VarScopedDeclarations_BlockStatement = VarScopedDeclarations_Block;

// 13.2.12 #sec-block-static-semantics-varscopeddeclarations
//   StatementListItem : Declaration
//
// (implicit)
//   StatementListItem : Statement
export function VarScopedDeclarations_StatementListItem(StatementListItem) {
  switch (true) {
    case isDeclaration(StatementListItem):
      return [];
    case isStatement(StatementListItem):
      return VarScopedDeclarations_Statement(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// 13.3.2.3 #sec-variable-statement-static-semantics-varscopeddeclarations
//   VariableDeclarationList :
//     VariableDeclaration
//     VariableDeclarationList `,` VariableDeclaration
export function VarScopedDeclarations_VariableDeclarationList(VariableDeclarationList) {
  return VariableDeclarationList;
}

// (implicit)
//   VariableStatement : `var` VariableDeclarationList `;`
export function VarScopedDeclarations_VariableStatement(VariableStatement) {
  return VarScopedDeclarations_VariableDeclarationList(VariableStatement.declarations);
}

// 13.6.6 #sec-if-statement-static-semantics-varscopeddeclarations
//   IfStatement :
//     `if` `(` Expression `)` Statement `else` Statement
//     `if` `(` Expression `)` Statement
export function VarScopedDeclarations_IfStatement(IfStatement) {
  if (IfStatement.alternate) {
    return [
      ...VarScopedDeclarations_Statement(IfStatement.consequent),
      ...VarScopedDeclarations_Statement(IfStatement.alternate),
    ];
  }
  return VarScopedDeclarations_Statement(IfStatement.consequent);
}

// 13.7.2.5 #sec-do-while-statement-static-semantics-varscopeddeclarations
//   IterationStatement : `do` Statement `while` `(` Expression `)` `;`
//
// 13.7.3.5 #sec-while-statement-static-semantics-varscopeddeclarations
//   IterationStatement : `while` `(` Expression `)` Statement
//
// 13.7.4.6 #sec-for-statement-static-semantics-varscopeddeclarations
//   IterationStatement :
//     `for` `(` Expression `;` Expression `;` Expression `)` Statement
//     `for` `(` `var` VariableDeclarationList `;` Expression `;` Expression `)` Statement
//     `for` `(` LexicalDeclaration Expression `;` Expression `)` Statement
//
// 13.7.5.8 #sec-for-in-and-for-of-statements-static-semantics-varscopeddeclarations
//   IterationStatement :
//     `for` `(` LeftHandSideExpression `in` Expression `)` Statement
//     `for` `(` `var` ForBinding `in` Expression `)` Statement
//     `for` `(` ForDeclaration `in` Expression `)` Statement
//     `for` `(` LeftHandSideExpression `of` AssignmentExpression `)` Statement
//     `for` `await` `(` LeftHandSideExpression `of` AssignmentExpression `)` Statement
//     `for` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
//     `for` `await` `(` `var` ForBinding `of` AssignmentExpression `)` Statement
//     `for` `(` ForDeclaration `of` Expression `)` Statement
//     `for` `await` `(` ForDeclaration `of` Expression `)` Statement
export function VarScopedDeclarations_IterationStatement(IterationStatement) {
  let declarationsFromBinding = [];
  switch (IterationStatement.type) {
    case 'DoWhileStatement':
    case 'WhileStatement':
      break;
    case 'ForStatement':
      if (IterationStatement.init && isVariableStatement(IterationStatement.init)) {
        const VariableDeclarationList = IterationStatement.init.declarations;
        declarationsFromBinding = VarScopedDeclarations_VariableDeclarationList(
          VariableDeclarationList,
        );
      }
      break;
    case 'ForInStatement':
    case 'ForOfStatement':
      if (isVariableStatement(IterationStatement.left)) {
        const ForBinding = IterationStatement.left.declarations[0].id;
        declarationsFromBinding = [ForBinding];
      }
      break;
    default:
      throw new TypeError(`Invalid IterationStatement: ${IterationStatement.type}`);
  }
  return [
    ...declarationsFromBinding,
    ...VarScopedDeclarations_Statement(IterationStatement.body),
  ];
}

// 13.11.6 #sec-with-statement-static-semantics-varscopeddeclarations
//   WithStatement : `with` `(` Expression `)` Statement
export function VarScopedDeclarations_WithStatement(WithStatement) {
  return VarScopedDeclarations_Statement(WithStatement.body);
}

// 13.12.8 #sec-switch-statement-static-semantics-varscopeddeclarations
//   SwitchStatement : `switch` `(` Expression `)` CaseBlock
export function VarScopedDeclarations_SwitchStatement(SwitchStatement) {
  return VarScopedDeclarations_CaseBlock(SwitchStatement.cases);
}

// 13.12.8 #sec-switch-statement-static-semantics-varscopeddeclarations
//   CaseBlock :
//     `{` `}`
//     `{` CaseClauses_opt DefaultClause CaseClauses_opt `}`
//   CaseClauses : CaseClauses CaseClause
//   CaseClause : `case` Expression `:` StatementList_opt
//   DefaultClause : `default` `:` StatementList_opt
//
// (implicit)
//   CaseBlock : `{` CaseClauses `}`
//   CaseClauses : CaseClause
export function VarScopedDeclarations_CaseBlock(CaseBlock) {
  const declarations = [];
  for (const CaseClauseOrDefaultClause of CaseBlock) {
    declarations.push(...VarScopedDeclarations_StatementList(CaseClauseOrDefaultClause.consequent));
  }
  return declarations;
}

// 13.13.13 #sec-labelled-statements-static-semantics-varscopeddeclarations
//   LabelledStatement : LabelIdentifier `:` LabelledItem
//   LabelledItem : FunctionDeclaration
//
// (implicit)
//   LabelledItem : Statement
export function VarScopedDeclarations_LabelledStatement(LabelledStatement) {
  const LabelledItem = LabelledStatement.body;
  switch (true) {
    case isFunctionDeclaration(LabelledItem):
      return [];
    case isStatement(LabelledItem):
      return VarScopedDeclarations_Statement(LabelledItem);
    default:
      throw new TypeError(`Invalid LabelledItem: ${LabelledItem.type}`);
  }
}

// 13.15.6 #sec-try-statement-static-semantics-varscopeddeclarations
//   TryStatement :
//     `try` Block Catch
//     `try` Block Finally
//     `try` Block Catch Finally
//   Catch : `catch` `(` CatchParameter `)` Block
//
// (implicit)
//   Catch : `catch` Block
//   Finally : `finally` Block
export function VarScopedDeclarations_TryStatement(TryStatement) {
  const declarationsBlock = VarScopedDeclarations_Block(TryStatement.block);
  const declarationsCatch = TryStatement.handler !== null
    ? VarScopedDeclarations_Block(TryStatement.handler.body) : [];
  const declarationsFinally = TryStatement.finalizer !== null
    ? VarScopedDeclarations_Block(TryStatement.finalizer) : [];
  return [
    ...declarationsBlock,
    ...declarationsCatch,
    ...declarationsFinally,
  ];
}

// 14.1.17 #sec-function-definitions-static-semantics-varscopeddeclarations
//   FunctionStatementList :
//     [empty]
//     StatementList
export const
  VarScopedDeclarations_FunctionStatementList = TopLevelVarScopedDeclarations_StatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const
  VarScopedDeclarations_FunctionBody = VarScopedDeclarations_FunctionStatementList;

// 14.2.13 #sec-arrow-function-definitions-static-semantics-varscopeddeclarations
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function VarScopedDeclarations_ConciseBody(ConciseBody) {
  switch (true) {
    case isExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return VarScopedDeclarations_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// 14.8.12 #sec-async-arrow-function-definitions-static-semantics-VarScopedDeclarations
//   AsyncConciseBody : [lookahead ≠ `{`] AssignmentExpression
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const VarScopedDeclarations_AsyncConciseBody = VarScopedDeclarations_ConciseBody;

// 15.1.6 #sec-scripts-static-semantics-varscopeddeclarations
//   ScriptBody : StatementList
export const VarScopedDeclarations_ScriptBody = TopLevelVarScopedDeclarations_StatementList;

// (implicit)
//   Script :
//     [empty]
//     ScriptBody
export const VarScopedDeclarations_Script = VarScopedDeclarations_ScriptBody;

// 15.2.1.14 #sec-module-semantics-static-semantics-varscopeddeclarations
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function VarScopedDeclarations_ModuleItemList(ModuleItemList) {
  const declarations = [];
  for (const ModuleItem of ModuleItemList) {
    declarations.push(...VarScopedDeclarations_ModuleItem(ModuleItem));
  }
  return declarations;
}

// (implicit)
//   ModuleBody : ModuleItemList
export const VarScopedDeclarations_ModuleBody = VarScopedDeclarations_ModuleItemList;

// 15.2.1.14 #sec-module-semantics-static-semantics-varscopeddeclarations
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const VarScopedDeclarations_Module = VarScopedDeclarations_ModuleBody;

// 15.2.1.14 #sec-module-semantics-static-semantics-varscopeddeclarations
//   ModuleItem :
//     ImportDeclaration
//     ExportDeclaration
//
// (implicit)
//   ModuleItem : StatementListItem
export function VarScopedDeclarations_ModuleItem(ModuleItem) {
  switch (true) {
    case isImportDeclaration(ModuleItem):
      return [];
    case isExportDeclaration(ModuleItem):
      if (isExportDeclarationWithVariable(ModuleItem)) {
        return VarScopedDeclarations_VariableStatement(ModuleItem.declaration);
      }
      return [];
    default:
      return VarScopedDeclarations_StatementListItem(ModuleItem);
  }
}
