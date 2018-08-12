import {
  isAssignmentExpression,
  isBlockStatement,
  isBreakStatement,
  isContinueStatement,
  isDebuggerStatement,
  isDeclaration,
  isEmptyStatement,
  isExportDeclaration,
  isExportDeclarationWithVariable,
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
  BoundNames_ForBinding,
  BoundNames_VariableDeclarationList,
  BoundNames_VariableStatement,
} from './BoundNames.mjs';
import {
  TopLevelVarDeclaredNames_StatementList,
} from './TopLevelVarDeclaredNames.mjs';

// 13.1.5 #sec-statement-semantics-static-semantics-vardeclarednames
//   Statement :
//     EmptyStatement
//     ExpressionStatement
//     ContinueStatement
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
export function VarDeclaredNames_Statement(Statement) {
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
      return VarDeclaredNames_BlockStatement(Statement);
    case isVariableStatement(Statement):
      return VarDeclaredNames_VariableStatement(Statement);
    case isIfStatement(Statement):
      return VarDeclaredNames_IfStatement(Statement);
    case isWithStatement(Statement):
      return VarDeclaredNames_WithStatement(Statement);
    case isLabelledStatement(Statement):
      return VarDeclaredNames_LabelledStatement(Statement);
    case isTryStatement(Statement):
      return VarDeclaredNames_TryStatement(Statement);
    case isIterationStatement(Statement):
      return VarDeclaredNames_IterationStatement(Statement);
    case isSwitchStatement(Statement):
      return VarDeclaredNames_SwitchStatement(Statement);

    default:
      throw new TypeError(`Invalid Statement: ${Statement.type}`);
  }
}

// 13.2.11 #sec-block-static-semantics-vardeclarednames
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function VarDeclaredNames_StatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...VarDeclaredNames_StatementListItem(StatementListItem));
  }
  return names;
}

// 13.2.11 #sec-block-static-semantics-vardeclarednames
//   Block : `{` `}`
//
// (implicit)
//   Block : `{` StatementList `}`
export function VarDeclaredNames_Block(Block) {
  return VarDeclaredNames_StatementList(Block.body);
}

// (implicit)
//   BlockStatement : Block
export const VarDeclaredNames_BlockStatement = VarDeclaredNames_Block;

// 13.2.11 #sec-block-static-semantics-vardeclarednames
//   StatementListItem : Declaration
//
// (implicit)
//   StatementListItem : Statement
export function VarDeclaredNames_StatementListItem(StatementListItem) {
  switch (true) {
    case isDeclaration(StatementListItem):
      return [];
    case isStatement(StatementListItem):
      return VarDeclaredNames_Statement(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// 13.3.2.2 #sec-variable-statement-static-semantics-vardeclarednames
//   VariableStatement : `var` VariableDeclarationList `;`
export const VarDeclaredNames_VariableStatement = BoundNames_VariableStatement;

// 13.6.5 #sec-if-statement-static-semantics-vardeclarednames
//   IfStatement :
//     `if` `(` Expression `)` Statement `else` Statement
//     `if` `(` Expression `)` Statement
export function VarDeclaredNames_IfStatement(IfStatement) {
  if (IfStatement.alternate) {
    return [
      ...VarDeclaredNames_Statement(IfStatement.consequent),
      ...VarDeclaredNames_Statement(IfStatement.alternate),
    ];
  }
  return VarDeclaredNames_Statement(IfStatement.consequent);
}

// 13.7.2.4 #sec-do-while-statement-static-semantics-vardeclarednames
//   IterationStatement : `do` Statement `while` `(` Expression `)` `;`
//
// 13.7.3.4 #sec-while-statement-static-semantics-vardeclarednames
//   IterationStatement : `while` `(` Expression `)` Statement
//
// 13.7.4.5 #sec-for-statement-static-semantics-vardeclarednames
//   IterationStatement :
//     `for` `(` Expression `;` Expression `;` Expression `)` Statement
//     `for` `(` `var` VariableDeclarationList `;` Expression `;` Expression `)` Statement
//     `for` `(` LexicalDeclaration Expression `;` Expression `)` Statement
//
// 13.7.5.7 #sec-for-in-and-for-of-statements-static-semantics-vardeclarednames
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
export function VarDeclaredNames_IterationStatement(IterationStatement) {
  let namesFromBinding = [];
  switch (IterationStatement.type) {
    case 'DoWhileStatement':
    case 'WhileStatement':
      break;
    case 'ForStatement':
      if (IterationStatement.init && isVariableStatement(IterationStatement.init)) {
        const VariableDeclarationList = IterationStatement.init.declarations;
        namesFromBinding = BoundNames_VariableDeclarationList(
          VariableDeclarationList,
        );
      }
      break;
    case 'ForInStatement':
    case 'ForOfStatement':
      if (isVariableStatement(IterationStatement.left)) {
        const ForBinding = IterationStatement.left.declarations[0].id;
        namesFromBinding = BoundNames_ForBinding(ForBinding);
      }
      break;
    default:
      throw new TypeError(`Invalid IterationStatement: ${IterationStatement.type}`);
  }
  return [
    ...namesFromBinding,
    ...VarDeclaredNames_Statement(IterationStatement.body),
  ];
}

// 13.11.6 #sec-with-statement-static-semantics-varscopeddeclarations
//   WithStatement : `with` `(` Expression `)` Statement
export function VarDeclaredNames_WithStatement(WithStatement) {
  return VarDeclaredNames_Statement(WithStatement.body);
}

// 13.12.7 #sec-switch-statement-static-semantics-vardeclarednames
//   SwitchStatement : `switch` `(` Expression `)` CaseBlock
export function VarDeclaredNames_SwitchStatement(SwitchStatement) {
  return VarDeclaredNames_CaseBlock(SwitchStatement.cases);
}

// 13.12.7 #sec-switch-statement-static-semantics-vardeclarednames
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
export function VarDeclaredNames_CaseBlock(CaseBlock) {
  const names = [];
  for (const CaseClauseOrDefaultClause of CaseBlock) {
    names.push(...VarDeclaredNames_StatementList(CaseClauseOrDefaultClause.consequent));
  }
  return names;
}

// 13.13.12 #sec-labelled-statements-static-semantics-vardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
//   LabelledItem : FunctionDeclaration
//
// (implicit)
//   LabelledItem : Statement
export function VarDeclaredNames_LabelledStatement(LabelledStatement) {
  const LabelledItem = LabelledStatement.body;
  switch (true) {
    case isFunctionDeclaration(LabelledItem):
      return [];
    case isStatement(LabelledItem):
      return VarDeclaredNames_Statement(LabelledItem);
    default:
      throw new TypeError(`Invalid LabelledItem: ${LabelledItem.type}`);
  }
}

// 13.15.5 #sec-try-statement-static-semantics-vardeclarednames
//   TryStatement :
//     `try` Block Catch
//     `try` Block Finally
//     `try` Block Catch Finally
//   Catch : `catch` `(` CatchParameter `)` Block
//
// (implicit)
//   Catch : `catch` Block
//   Finally : `finally` Block
export function VarDeclaredNames_TryStatement(TryStatement) {
  const namesBlock = VarDeclaredNames_Block(TryStatement.block);
  const namesCatch = TryStatement.handler !== null
    ? VarDeclaredNames_Block(TryStatement.handler.body) : [];
  const namesFinally = TryStatement.finalizer !== null
    ? VarDeclaredNames_Block(TryStatement.finalizer) : [];
  return [
    ...namesBlock,
    ...namesCatch,
    ...namesFinally,
  ];
}

// 14.1.16 #sec-function-definitions-static-semantics-vardeclarednames
//   FunctionStatementList :
//     [empty]
//     StatementList
export const VarDeclaredNames_FunctionStatementList = TopLevelVarDeclaredNames_StatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const VarDeclaredNames_FunctionBody = VarDeclaredNames_FunctionStatementList;

// 14.2.12 #sec-arrow-function-definitions-static-semantics-vardeclarednames
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function VarDeclaredNames_ConciseBody(ConciseBody) {
  switch (true) {
    case isAssignmentExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return VarDeclaredNames_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// 14.8.11 #sec-async-arrow-function-definitions-static-semantics-VarDeclaredNames
//   AsyncConciseBody : [lookahead ≠ `{`] AssignmentExpression
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const VarDeclaredNames_AsyncConciseBody = VarDeclaredNames_ConciseBody;

// 15.1.5 #sec-scripts-static-semantics-vardeclarednames
//   ScriptBody : StatementList
export const VarDeclaredNames_ScriptBody = TopLevelVarDeclaredNames_StatementList;

// (implicit)
//   Script :
//     [empty]
//     ScriptBody
export const VarDeclaredNames_Script = VarDeclaredNames_ScriptBody;

// 15.2.1.13 #sec-module-semantics-static-semantics-vardeclarednames
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function VarDeclaredNames_ModuleItemList(ModuleItemList) {
  const names = [];
  for (const ModuleItem of ModuleItemList) {
    names.push(...VarDeclaredNames_ModuleItem(ModuleItem));
  }
  return names;
}

// (implicit)
//   ModuleBody : ModuleItemList
export const VarDeclaredNames_ModuleBody = VarDeclaredNames_ModuleItemList;

// 15.2.1.13 #sec-module-semantics-static-semantics-vardeclarednames
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const VarDeclaredNames_Module = VarDeclaredNames_ModuleBody;

// 15.2.1.13 #sec-module-semantics-static-semantics-vardeclarednames
//   ModuleItem :
//     ImportDeclaration
//     ExportDeclaration
//
// (implicit)
//   ModuleItem : StatementListItem
export function VarDeclaredNames_ModuleItem(ModuleItem) {
  switch (true) {
    case isImportDeclaration(ModuleItem):
      return [];
    case isExportDeclaration(ModuleItem):
      if (isExportDeclarationWithVariable(ModuleItem)) {
        return BoundNames_VariableStatement(ModuleItem.declaration);
      }
      return [];
    default:
      return VarDeclaredNames_StatementListItem(ModuleItem);
  }
}
