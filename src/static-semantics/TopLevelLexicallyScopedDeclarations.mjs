import {
  isDeclaration,
  isHoistableDeclaration,
  isStatement,
} from '../ast.mjs';

// 13.2.8 #sec-block-static-semantics-toplevellexicallyscopeddeclarations
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
export function TopLevelLexicallyScopedDeclarations_StatementList(StatementList) {
  const declarations = [];
  for (const StatementListItem of StatementList) {
    declarations.push(...TopLevelLexicallyScopedDeclarations_StatementListItem(StatementListItem));
  }
  return declarations;
}

// 13.2.8 #sec-block-static-semantics-toplevellexicallyscopeddeclarations
//   StatementListItem :
//     Statement
//     Declaration
export function TopLevelLexicallyScopedDeclarations_StatementListItem(StatementListItem) {
  switch (true) {
    case isStatement(StatementListItem):
      return [];
    case isDeclaration(StatementListItem):
      if (isHoistableDeclaration(StatementListItem)) {
        return [];
      }
      return [StatementListItem];
    default:
      throw new TypeError(`Unexpected StatementListItem: ${StatementListItem.type}`);
  }
}
