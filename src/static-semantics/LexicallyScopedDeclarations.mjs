import {
  isBlockStatement,
  isDeclaration,
  isExpression,
  isFunctionDeclaration,
  isLabelledStatement,
  isStatement,
  isSwitchCase,
} from '../ast.mjs';
import {
  TopLevelLexicallyScopedDeclarations_StatementList,
} from './TopLevelLexicallyScopedDeclarations.mjs';
import { DeclarationPart_Declaration } from './DeclarationPart.mjs';

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

// 14.1.15 #sec-function-definitions-static-semantics-lexicallydeclarednames
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
//   ConciseBody : AssignmentExpression
//
// (implicit)
//   ConciseBody : `{` FunctionBody `}`
export function LexicallyScopedDeclarations_ConciseBody(ConciseBody) {
  switch (true) {
    case isExpression(ConciseBody):
      return [];
    case isBlockStatement(ConciseBody):
      return LexicallyScopedDeclarations_FunctionBody(ConciseBody.body);
    default:
      throw new TypeError(`Unexpected ConciseBody: ${ConciseBody.type}`);
  }
}

// 14.8.10 #sec-async-arrow-function-definitions-static-semantics-LexicallyScopedDeclarations
//   AsyncConciseBody : [lookahead ≠ `{`] AssignmentExpression
//
// (implicit)
//   AsyncConciseBody : `{` AsyncFunctionBody `}`
//   AsyncFunctionBody : FunctionBody
export const LexicallyScopedDeclarations_AsyncConciseBody = LexicallyScopedDeclarations_ConciseBody;

// 15.1.4 #sec-scripts-static-semantics-lexicallyscopeddeclarations
//   ScriptBody : StatementList
export const
  LexicallyScopedDeclarations_ScriptBody = TopLevelLexicallyScopedDeclarations_StatementList;
