import {
  isDeclaration,
  isFunctionDeclaration,
  isHoistableDeclaration,
  isStatement,
  isLabelledStatement,
} from '../ast.mjs';

import {
  BoundNames_FunctionDeclaration,
  BoundNames_HoistableDeclaration,
} from './BoundNames.mjs';

import { VarDeclaredNames_Statement } from './VarDeclaredNames.mjs';

// 13.2.9 #sec-block-static-semantics-toplevelvardeclarednames
//   StatementList : StatementList StatementListItem
export function TopLevelVarDeclaredNames_StatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...TopLevelVarDeclaredNames_StatementListItem(StatementListItem));
  }
  return names;
}

// 13.2.9 #sec-block-static-semantics-toplevelvardeclarednames
//   StatementListItem : Declaration
//   StatementListItem : Statement
export function TopLevelVarDeclaredNames_StatementListItem(StatementListItem) {
  switch (true) {
    case isDeclaration(StatementListItem):
      if (isHoistableDeclaration(StatementListItem)) {
        return BoundNames_HoistableDeclaration(StatementListItem);
      }
      return [];
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return TopLevelVarDeclaredNames_LabelledStatement(StatementListItem);
      }
      return VarDeclaredNames_Statement(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// 13.13.10 #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function TopLevelVarDeclaredNames_LabelledStatement(LabelledStatement) {
  return TopLevelVarDeclaredNames_LabelledItem(LabelledStatement.body);
}

// 13.13.10 #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledItem : Statement
//   LabelledItem : FunctionDeclaration
export function TopLevelVarDeclaredNames_LabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      if (isLabelledStatement(LabelledItem)) {
        return TopLevelVarDeclaredNames_LabelledItem(LabelledItem.body);
      }
      return VarDeclaredNames_Statement(LabelledItem);
    case isFunctionDeclaration(LabelledItem):
      return BoundNames_FunctionDeclaration(LabelledItem);
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}
