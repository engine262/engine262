import {
  isDeclaration,
  isHoistableDeclaration,
  isStatement,
} from '../ast.mjs';
import {
  BoundNames_Declaration,
} from './BoundNames.mjs';

// 13.2.7 #sec-block-static-semantics-toplevellexicallydeclarednames
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function TopLevelLexicallyDeclaredNames_StatementList(StatementList) {
  const names = [];
  for (const StatementListItem of StatementList) {
    names.push(...TopLevelLexicallyDeclaredNames_StatementListItem(StatementListItem));
  }
  return names;
}

// 13.2.7 #sec-block-static-semantics-toplevellexicallydeclarednames
//   StatementListItem :
//     Statement
//     Declaration
export function TopLevelLexicallyDeclaredNames_StatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      return [];
    case isDeclaration(StatementListItem):
      if (isHoistableDeclaration(StatementListItem)) {
        return [];
      }
      return BoundNames_Declaration(StatementListItem);
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}
