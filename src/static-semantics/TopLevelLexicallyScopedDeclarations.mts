// @ts-nocheck
export function TopLevelLexicallyScopedDeclarations(node) {
  if (Array.isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...TopLevelLexicallyScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
      return [node];
    default:
      return [];
  }
}
