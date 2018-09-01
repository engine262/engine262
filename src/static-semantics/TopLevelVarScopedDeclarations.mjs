import {
  isDeclaration,
  isFunctionDeclaration,
  isHoistableDeclaration,
  isLabelledStatement,
  isStatement,
} from '../ast.mjs';

import { DeclarationPart_Declaration } from './DeclarationPart.mjs';
import { VarScopedDeclarations_Statement } from './VarScopedDeclarations.mjs';

// 13.2.10 #sec-block-static-semantics-toplevelvarscopeddeclarations
//   StatementList : StatementList StatementListItem
export function TopLevelVarScopedDeclarations_StatementList(StatementList) {
  const declarations = [];
  for (const StatementListItem of StatementList) {
    declarations.push(...TopLevelVarScopedDeclarations_StatementListItem(StatementListItem));
  }
  return declarations;
}

// 13.2.10 #sec-block-static-semantics-toplevelvarscopeddeclarations
//   StatementListItem :
//     Statement
//     Declaration
export function TopLevelVarScopedDeclarations_StatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      if (isLabelledStatement(StatementListItem)) {
        return TopLevelVarScopedDeclarations_LabelledStatement(StatementListItem);
      }
      return VarScopedDeclarations_Statement(StatementListItem);
    case isDeclaration(StatementListItem):
      if (isHoistableDeclaration(StatementListItem)) {
        return [DeclarationPart_Declaration(StatementListItem)];
      }
      return [];
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}

// 13.13.11 #sec-labelled-statements-static-semantics-toplevelvarscopeddeclarations
//   LabelledStatement : LabelIdentifier `:` LabelledItem
export function TopLevelVarScopedDeclarations_LabelledStatement(LabelledStatement) {
  return TopLevelVarScopedDeclarations_LabelledItem(LabelledStatement.body);
}

// 13.13.11 #sec-labelled-statements-static-semantics-toplevelvarscopeddeclarations
//   LabelledItem :
//     Statement
//     FunctionDeclaration
export function TopLevelVarScopedDeclarations_LabelledItem(LabelledItem) {
  switch (true) {
    case isStatement(LabelledItem):
      if (isLabelledStatement(LabelledItem)) {
        return TopLevelVarScopedDeclarations_LabelledItem(LabelledItem.body);
      }
      return VarScopedDeclarations_Statement(LabelledItem);
    case isFunctionDeclaration(LabelledItem):
      return [LabelledItem];
    default:
      throw new TypeError(`Unexpected LabelledItem: ${LabelledItem.type}`);
  }
}
