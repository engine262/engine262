import {
  isAssignmentExpression,
  isBlockStatement,
  isDeclaration,
  isFunctionDeclaration,
  isLabelledStatement,
  isStatement,
} from '../ast.mjs';
import {
  TopLevelLexicallyDeclaredNames_StatementList,
} from './TopLevelLexicallyDeclaredNames.mjs';
import {
  BoundNames_Declaration,
  BoundNames_FunctionDeclaration,
} from './BoundNames.mjs';
import {
  VarDeclaredNames_StatementListItem,
} from './VarDeclaredNames.mjs';

// #sec-scripts-static-semantics-lexicallydeclarednames
//   ScriptBody : StatementList
export const LexicallyDeclaredNames_ScriptBody = TopLevelLexicallyDeclaredNames_StatementList;

// #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function LexicallyDeclaredNames_LabelledStatement(LabelledStatement) {
  return LexicallyDeclaredNames_LabelledItem(LabelledStatement.body);
}

// #sec-labelled-statements-static-semantics-lexicallydeclarednames
//   LabelledItem : Statement
//   LabelledItem : FunctionDeclaration
export function LexicallyDeclaredNames_LabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      return [];
    case isFunctionDeclaration(LabelledItem):
      return BoundNames_FunctionDeclaration(LabelledItem);
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}

// #sec-block-static-semantics-lexicallydeclarednames
//   StatementListItem : Statement
//   StatementListItem : Declaration
export function LexicallyDeclaredNames_StatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return LexicallyDeclaredNames_LabelledStatement(StatementListItem);
      }
      return VarDeclaredNames_StatementListItem(StatementListItem);
    case isDeclaration(StatementListItem):
      return BoundNames_Declaration(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// #sec-block-static-semantics-lexicallydeclarednames
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function LexicallyDeclaredNames_StatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...LexicallyDeclaredNames_StatementListItem(StatementListItem));
  }
  return names;
}

// #sec-function-definitions-static-semantics-lexicallydeclarednames
//   FunctionStatementList : [empty]
//   FunctionStatementList : StatementList
export const
  LexicallyDeclaredNames_FunctionStatementList = TopLevelLexicallyDeclaredNames_StatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const LexicallyDeclaredNames_FunctionBody = LexicallyDeclaredNames_FunctionStatementList;

// #sec-arrow-function-definitions-static-semantics-lexicallydeclarednames
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function LexicallyDeclaredNames_ConciseBody(ConciseBody) {
  switch (true) {
    case isAssignmentExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return LexicallyDeclaredNames_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// #sec-arrow-function-definitions-static-semantics-lexicallydeclarednames
//   AsyncConciseBody : [lookahead ≠ `{`] AssignmentExpression
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const LexicallyDeclaredNames_AsyncConciseBody = LexicallyDeclaredNames_ConciseBody;
