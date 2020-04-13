import { Value } from '../value.mjs';
import { StringValue } from './all.mjs';

export function BoundNames(node) {
  if (Array.isArray(node)) {
    const names = [];
    for (const item of node) {
      names.push(...BoundNames(item));
    }
    return names;
  }
  switch (node.type) {
    case 'BindingIdentifier':
      return [StringValue(node)];
    case 'LexicalDeclaration':
      return BoundNames(node.BindingList);
    case 'LexicalBinding':
      return BoundNames(node.BindingIdentifier);
    case 'VariableStatement':
      return BoundNames(node.VariableDeclarationList);
    case 'VariableDeclaration':
      return BoundNames(node.BindingIdentifier);
    case 'ForDeclaration':
      return BoundNames(node.ForBinding);
    case 'FunctionDeclaration':
    case 'GeneratorDeclaration':
    case 'AsyncFunctionDeclaration':
    case 'AsyncGeneratorDeclaration':
    case 'ClassDeclaration':
      if (node.BindingIdentifier) {
        return BoundNames(node.BindingIdentifier);
      }
      return [new Value('*default*')];
    case 'ImportDeclaration':
      return BoundNames(node.ImportClause);
    case 'SingleNameBinding':
      return BoundNames(node.BindingIdentifier);
    case 'BindingRestElement':
      return BoundNames(node.BindingIdentifier);
    default:
      return [];
  }
}
