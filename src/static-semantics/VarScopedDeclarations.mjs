import { TopLevelVarScopedDeclarations } from './all.mjs';

export function VarScopedDeclarations(node) {
  if (Array.isArray(node)) {
    const declarations = [];
    for (const item of node) {
      declarations.push(...VarScopedDeclarations(item));
    }
    return declarations;
  }
  switch (node.type) {
    case 'VariableStatement':
      return VarScopedDeclarations(node.VariableDeclarationList);
    case 'VariableDeclaration':
      return [node];
    case 'IfStatement': {
      const declarations = VarScopedDeclarations(node.Statement_a);
      if (node.Statement_b !== null) {
        declarations.push(...VarScopedDeclarations(node.Statement_b));
      }
      return declarations;
    }
    case 'IterationStatement':
      return VarScopedDeclarations(node.Statement);
    case 'WithStatement':
      return VarScopedDeclarations(node.Statement);
    case 'SwitchStatement':
      return VarScopedDeclarations(node.CaseBlock);
    case 'LabelledStatement':
      return VarScopedDeclarations(node.LabelledItem);
    case 'TryStatement': {
      const declarations = VarScopedDeclarations(node.Block);
      if (node.Catch !== null) {
        declarations.push(...VarScopedDeclarations(node.Catch));
      }
      if (node.Finally !== null) {
        declarations.push(...VarScopedDeclarations(node.Finally));
      }
      return declarations;
    }
    case 'Script':
      if (node.ScriptBody === null) {
        return [];
      }
      return VarScopedDeclarations(node.ScriptBody);
    case 'ScriptBody':
      return TopLevelVarScopedDeclarations(node.StatementList);
    default:
      return [];
  }
}
