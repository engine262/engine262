import {
  isBlockStatement,
  isDeclaration,
  isExpression,
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

// 13.2.5 #sec-block-static-semantics-lexicallydeclarednames
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

// 13.2.5 #sec-block-static-semantics-lexicallydeclarednames
//   StatementListItem :
//     Statement
//     Declaration
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

// 13.13.6 #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function LexicallyDeclaredNames_LabelledStatement(LabelledStatement) {
  return LexicallyDeclaredNames_LabelledItem(LabelledStatement.body);
}

// 13.13.6 #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledItem :
//     Statement
//     FunctionDeclaration
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

// 14.1.14 #sec-function-definitions-static-semantics-lexicallydeclarednames
//   FunctionStatementList :
//     [empty]
//     StatementList
export const
  LexicallyDeclaredNames_FunctionStatementList = TopLevelLexicallyDeclaredNames_StatementList;

// (implicit)
//   FunctionBody : FunctionStatementList
export const LexicallyDeclaredNames_FunctionBody = LexicallyDeclaredNames_FunctionStatementList;

// (implicit)
//   GeneratorBody : FunctionBody
export const LexicallyDeclaredNames_GeneratorBody = LexicallyDeclaredNames_FunctionBody;

// (implicit)
//   AsyncFunctionBody : FunctionBody
export const LexicallyDeclaredNames_AsyncFunctionBody = LexicallyDeclaredNames_FunctionBody;

// (implicit)
//   AsyncGeneratorBody : FunctionBody
export const LexicallyDeclaredNames_AsyncGeneratorBody = LexicallyDeclaredNames_FunctionBody;

// 14.2.10 #sec-arrow-function-definitions-static-semantics-lexicallydeclarednames
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function LexicallyDeclaredNames_ConciseBody(ConciseBody) {
  switch (true) {
    case isExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return LexicallyDeclaredNames_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// 14.8.9 #sec-async-arrow-function-definitions-static-semantics-LexicallyDeclaredNames
//   AsyncConciseBody : [lookahead ≠ `{`] AssignmentExpression
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const LexicallyDeclaredNames_AsyncConciseBody = LexicallyDeclaredNames_ConciseBody;

// 15.1.3 #sec-scripts-static-semantics-lexicallydeclarednames
//   ScriptBody : StatementList
export const LexicallyDeclaredNames_ScriptBody = TopLevelLexicallyDeclaredNames_StatementList;
