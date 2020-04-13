import { TopLevelVarScopedDeclarations } from './all.mjs';

export function VarScopedDeclarations(node) {
  if (Array.isArray(node)) {
    return node.flatMap(VarScopedDeclarations);
  }
  switch (node.type) {
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
      return VarScopedDeclarations(node.ScriptBody);
    case 'ScriptBody':
      return TopLevelVarScopedDeclarations(node.StatementList);
    default:
      return [];
  }
}
