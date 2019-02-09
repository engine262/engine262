import {
  isBlockStatement,
  isDeclaration,
  isExpressionBody,
  isFunctionDeclaration,
  isLabelledStatement,
  isStatement,
  isSwitchCase,
  isImportDeclaration,
  isExportDeclaration,
  isExportDeclarationWithStar,
  isExportDeclarationWithVariable,
  isExportDeclarationWithDeclaration,
  isExportDeclarationWithExport,
  isExportDeclarationWithExportAndFrom,
  isExportDeclarationWithDefaultAndHoistable,
  isExportDeclarationWithDefaultAndClass,
  isExportDeclarationWithDefaultAndExpression,
  isStatementListItem,
} from '../ast.mjs';
import {
  DeclarationPart_Declaration,
  DeclarationPart_HoistableDeclaration,
  TopLevelLexicallyScopedDeclarations_StatementList,
} from './all.mjs';
import { OutOfRange } from '../helpers.mjs';

// 13.2.6 #sec-block-static-semantics-lexicallyscopeddeclarations
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function LexicallyScopedDeclarations_StatementList(StatementList) {
  const declarations = [];
  for (const StatementListItem of StatementList) {
    declarations.push(...LexicallyScopedDeclarations_StatementListItem(StatementListItem));
  }
  return declarations;
}

// 13.2.6 #sec-block-static-semantics-lexicallyscopeddeclarations
//   StatementListItem :
//     Statement
//     Declaration
export function LexicallyScopedDeclarations_StatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return LexicallyScopedDeclarations_LabelledStatement(StatementListItem);
      }
      return [];
    case isDeclaration(StatementListItem):
      return [DeclarationPart_Declaration(StatementListItem)];
    case isSwitchCase(StatementListItem):
      return LexicallyScopedDeclarations_StatementList(StatementListItem.consequent);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// 13.13.7 #sec-labelled-statements-static-semantics-lexicallyscopeddeclarations
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function LexicallyScopedDeclarations_LabelledStatement(LabelledStatement) {
  return LexicallyScopedDeclarations_LabelledItem(LabelledStatement.body);
}

// 13.13.7 #sec-labelled-statements-static-semantics-lexicallyscopeddeclarations
//   LabelledItem :
//     Statement
//     FunctionDeclaration
export function LexicallyScopedDeclarations_LabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      return [];
    case isFunctionDeclaration(LabelledItem):
      return [LabelledItem];
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}

// 14.1.14 #sec-function-definitions-static-semantics-lexicallydeclarednames
//   FunctionStatementList :
//     [empty]
//     StatementList
export const // eslint-disable-next-line max-len
  LexicallyScopedDeclarations_FunctionStatementList = TopLevelLexicallyScopedDeclarations_StatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const LexicallyScopedDeclarations_FunctionBody = LexicallyScopedDeclarations_FunctionStatementList;

// (implicit)
//   GeneratorBody : FunctionBody
//   AsyncFunctionBody : FunctionBody
export const LexicallyScopedDeclarations_GeneratorBody = LexicallyScopedDeclarations_FunctionBody;
export const LexicallyScopedDeclarations_AsyncFunctionBody = LexicallyScopedDeclarations_FunctionBody;

// 14.2.11 #sec-arrow-function-definitions-static-semantics-lexicallyscopeddeclarations
//   ConciseBody : ExpressionBody
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function LexicallyScopedDeclarations_ConciseBody(ConciseBody) {
  switch (true) {
    case isExpressionBody(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return LexicallyScopedDeclarations_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// 14.8.10 #sec-async-arrow-function-definitions-static-semantics-LexicallyScopedDeclarations
//   AsyncConciseBody : [lookahead ≠ `{`] ExpressionBody
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const LexicallyScopedDeclarations_AsyncConciseBody = LexicallyScopedDeclarations_ConciseBody;

// 15.1.4 #sec-scripts-static-semantics-lexicallyscopeddeclarations
//   ScriptBody : StatementList
export const LexicallyScopedDeclarations_ScriptBody = TopLevelLexicallyScopedDeclarations_StatementList;

// 15.2.3.8 #sec-exports-static-semantics-lexicallyscopeddeclarations
//   ExportDeclaration :
//     `export` `*` FromClause `;`
//     `export` ExportClause FromClause `;`
//     `export` ExportClause `;`
//     `export` VariableStatement
//     `export` Declaration
//     `export` `default` HoistableDeclaration
//     `export` `default` ClassDeclaration
//     `export` `default` AssignmentExpression `;`
export function LexicallyScopedDeclarations_ExportDeclaration(ExportDeclaration) {
  switch (true) {
    case isExportDeclarationWithStar(ExportDeclaration):
    case isExportDeclarationWithExportAndFrom(ExportDeclaration):
    case isExportDeclarationWithExport(ExportDeclaration):
    case isExportDeclarationWithVariable(ExportDeclaration):
      return [];
    case isExportDeclarationWithDeclaration(ExportDeclaration):
      return [DeclarationPart_Declaration(ExportDeclaration.declaration)];
    case isExportDeclarationWithDefaultAndHoistable(ExportDeclaration):
      return [DeclarationPart_HoistableDeclaration(ExportDeclaration.declaration)];
    case isExportDeclarationWithDefaultAndClass(ExportDeclaration):
      return [ExportDeclaration.declaration];
    case isExportDeclarationWithDefaultAndExpression(ExportDeclaration):
      return [ExportDeclaration];
    default:
      throw new OutOfRange('LexicallyScopedDeclarations_ExportDeclaration', ExportDeclaration);
  }
}

// 15.2.1.12 #sec-module-semantics-static-semantics-lexicallyscopeddeclarations
//   ModuleItem : ImportDeclaration
//
// (implicit)
//   ModuleItem :
//     ExportDeclaration
//     StatementListItem
export function LexicallyScopedDeclarations_ModuleItem(ModuleItem) {
  switch (true) {
    case isImportDeclaration(ModuleItem):
      return [];
    case isExportDeclaration(ModuleItem):
      return LexicallyScopedDeclarations_ExportDeclaration(ModuleItem);
    case isStatementListItem(ModuleItem):
      return LexicallyScopedDeclarations_StatementListItem(ModuleItem);
    default:
      throw new OutOfRange('LexicallyScopedDeclarations_ModuleItem', ModuleItem);
  }
}

// 15.2.1.12 #sec-module-semantics-static-semantics-lexicallyscopeddeclarations
//   ModuleItemList : ModuleItemList ModuleItem
//
// (implicit)
//   ModuleItemList : ModuleItem
export function LexicallyScopedDeclarations_ModuleItemList(ModuleItemList) {
  const declarations = [];
  for (const ModuleItem of ModuleItemList) {
    declarations.push(...LexicallyScopedDeclarations_ModuleItem(ModuleItem));
  }
  return declarations;
}

// (implicit)
//   ModuleBody : ModuleItemList
export const LexicallyScopedDeclarations_ModuleBody = LexicallyScopedDeclarations_ModuleItemList;

// 15.2.1.12 #sec-module-semantics-static-semantics-lexicallyscopeddeclarations
//   Module : [empty]
//
// (implicit)
//   Module : ModuleBody
export const LexicallyScopedDeclarations_Module = LexicallyScopedDeclarations_ModuleBody;
