import { BoundNames, VarDeclaredNames } from './all.mjs';

export function TopLevelVarDeclaredNames(node) {
  if (Array.isArray(node)) {
    const names = [];
    for (const item of node) {
      names.push(...TopLevelVarDeclaredNames(item));
    }
    return names;
  }
  switch (node.type) {
    case 'LabelledStatement':
      if (node.LabelledItem.type === 'LabelledStatement') {
        return TopLevelVarDeclaredNames(node.LabelledItem);
      }
      return VarDeclaredNames(node.LabelledItem);
    case 'ClassDeclaration':
    case 'LexicalDeclaration':
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
      return BoundNames(node);
    default:
      return [];
  }
}
