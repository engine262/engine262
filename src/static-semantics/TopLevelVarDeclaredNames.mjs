import {
  isDeclaration,
  isHoistableDeclaration,
  isStatement,
  isLabelledStatement,
} from '../ast.mjs';

import {
  BoundNames,
  BoundNamesFunctionDeclaration,
} from './BoundNames.mjs';

import {
  VarDeclaredNames,
} from './VarDeclaredNames.mjs';

// Static Semantics: TopLevelVarDeclaredNames
// #sec-block-static-semantics-toplevelvardeclarednames
//   StatementList : StatementList StatementListItem
export function TopLevelVarDeclaredNamesStatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...TopLevelVarDeclaredNamesStatementListItem(StatementListItem));
  }
  return names;
}


// #sec-block-static-semantics-toplevelvardeclarednames
//   StatementListItem : Declaration
//   StatementListItem : Statement
// #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function TopLevelVarDeclaredNamesStatementListItem(StatementListItem) {
  switch (true) {
    case isDeclaration(StatementListItem):
      if (isHoistableDeclaration(StatementListItem)) {
        return BoundNames(StatementListItem);
      }
      return [];
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return TopLevelVarDeclaredNamesLabelledItem(StatementListItem.body);
      }
      return VarDeclaredNames(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// #sec-labelled-statements-static-semantics-toplevelvardeclarednames
//   LabelledItem : Statement
//   LabelledItem : FunctionDeclaration
export function TopLevelVarDeclaredNamesLabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      if (isLabelledStatement(LabelledItem)) {
        return TopLevelVarDeclaredNamesLabelledItem(LabelledItem.body);
      }
      return VarDeclaredNames(LabelledItem);
    case isFunctionDeclaration(LabelledItem):
      return BoundNamesFunctionDeclaration(LabelledItem);
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}
