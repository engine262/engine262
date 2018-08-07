import {
  isAssignmentExpression,
  isDeclaration,
  isLabelledStatement,
  isStatement,
} from '../ast.mjs';
import {
  TopLevelLexicallyDeclaredNamesStatementList,
} from './TopLevelLexicallyDeclaredNames.mjs';
import {
  BoundNamesDeclaration,
  BoundNamesFunctionDeclaration,
} from './BoundNames.mjs';
import {
  VarDeclaredNamesStatementListItem,
} from './VarDeclaredNames.mjs';

// #sec-scripts-static-semantics-lexicallydeclarednames
//   ScriptBody : StatementList
export const LexicallyDeclaredNamesScriptBody = TopLevelLexicallyDeclaredNamesStatementList;

// #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function LexicallyDeclaredNamesLabelledStatement(LabelledStatement) {
  return LexicallyDeclaredNamesLabelledItem(LabelledStatement.body);
}

// #sec-labelled-statements-static-semantics-lexicallydeclarednames
//   LabelledItem : Statement
//   LabelledItem : FunctionDeclaration
export function LexicallyDeclaredNamesLabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      return [];
    case isFunctionDeclaration(LabelledItem):
      return BoundNamesFunctionDeclaration(LabelledItem);
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}

// #sec-block-static-semantics-lexicallydeclarednames
//   StatementListItem : Statement
//   StatementListItem : Declaration
export function LexicallyDeclaredNamesStatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return LexicallyDeclaredNamesLabelledStatement(StatementListItem);
      }
      return VarDeclaredNamesStatementListItem(StatementListItem);
    case isDeclaration(StatementListItem):
      return BoundNamesDeclaration(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// #sec-block-static-semantics-lexicallydeclarednames
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function LexicallyDeclaredNamesStatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...LexicallyDeclaredNamesStatementListItem(StatementListItem));
  }
  return names;
}

// #sec-function-definitions-static-semantics-lexicallydeclarednames
//   FunctionStatementList : [empty]
//   FunctionStatementList : StatementList
export const LexicallyDeclaredNamesFunctionStatementList = TopLevelLexicallyDeclaredNamesStatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const LexicallyDeclaredNamesFunctionBody = LexicallyDeclaredNamesFunctionStatementList;

// #sec-arrow-function-definitions-static-semantics-lexicallydeclarednames
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function LexicallyDeclaredNamesConciseBody(ConciseBody) {
  switch (true) {
    case isAssignmentExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return LexicallyDeclaredNamesFunctionBody(ConciseBody.body);
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
export const LexicallyDeclaredNamesAsyncConciseBody = LexicallyDeclaredNamesConciseBody;
