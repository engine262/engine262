import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';
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
      if (node.BindingIdentifier) {
        return BoundNames(node.BindingIdentifier);
      }
      return BoundNames(node.BindingPattern);
    case 'VariableStatement':
      return BoundNames(node.VariableDeclarationList);
    case 'VariableDeclaration':
      return BoundNames(node.BindingIdentifier);
    case 'ForDeclaration':
      return BoundNames(node.ForBinding);
    case 'ForBinding':
      return BoundNames(node.BindingIdentifier);
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
    case 'ExportDeclaration':
      if (node.FromClause || node.NamedExports) {
        return [];
      }
      if (node.VariableStatement) {
        return BoundNames(node.VariableStatement);
      }
      if (node.Declaration) {
        return BoundNames(node.Declaration);
      }
      if (node.HoistableDeclaration) {
        const declarationNames = BoundNames(node.HoistableDeclaration);
        return declarationNames;
      }
      if (node.ClassDeclaration) {
        const declarationNames = BoundNames(node.ClassDeclaration);
        return declarationNames;
      }
      if (node.AssignmentExpression) {
        return [new Value('*default*')];
      }
      throw new OutOfRange('BoundNames', node);
    case 'SingleNameBinding':
      return BoundNames(node.BindingIdentifier);
    case 'BindingRestElement':
      return BoundNames(node.BindingIdentifier);
    default:
      return [];
  }
}
