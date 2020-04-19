import { BoundNames, TopLevelVarDeclaredNames } from './all.mjs';

export function VarDeclaredNames(node) {
  if (Array.isArray(node)) {
    const names = [];
    for (const item of node) {
      names.push(...VarDeclaredNames(item));
    }
    return names;
  }
  switch (node.type) {
    case 'VariableStatement':
      return BoundNames(node.VariableDeclarationList);
    case 'IfStatement': {
      const names = VarDeclaredNames(node.Statement_a);
      if (node.Statement_b) {
        names.push(...VarDeclaredNames(node.Statement_b));
      }
      return names;
    }
    case 'Block':
      return VarDeclaredNames(node.StatementList);
    case 'WhileStatement':
      return VarDeclaredNames(node.Statement);
    case 'DoWhileStatement':
      return VarDeclaredNames(node.Statement);
    case 'ForStatement': {
      const names = VarDeclaredNames(node.Statement);
      if (node.VariableDeclarationList) {
        names.push(...VarDeclaredNames(node.VariableDeclarationList));
      }
      return names;
    }
    case 'ForInStatement': {
      const names = VarDeclaredNames(node.Statement);
      if (node.ForBinding) {
        names.push(...VarDeclaredNames(node.ForBinding));
      }
      return names;
    }
    case 'ForOfStatement':
    case 'ForAwaitStatement': {
      const names = VarDeclaredNames(node.Statement);
      if (node.ForBinding) {
        names.push(...VarDeclaredNames(node.ForBinding));
      }
      return names;
    }
    case 'WithStatement':
      return VarDeclaredNames(node.Statement);
    case 'SwitchStatement':
      return VarDeclaredNames(node.CaseBlock);
    case 'CaseBlock': {
      const names = [];
      if (node.CaseClauses_a) {
        names.push(...VarDeclaredNames(node.CaseClauses_a));
      }
      if (node.DefaultClause) {
        names.push(...VarDeclaredNames(node.DefaultClause));
      }
      if (node.CaseClauses_b) {
        names.push(...VarDeclaredNames(node.CaseClauses_b));
      }
      return names;
    }
    case 'CaseClause':
    case 'DefaultClause':
      if (node.StatementList) {
        return VarDeclaredNames(node.StatementList);
      }
      return [];
    case 'LabelledStatement':
      return VarDeclaredNames(node.LabelledItem);
    case 'TryStatement': {
      const names = VarDeclaredNames(node.Block);
      if (node.Catch) {
        names.push(...VarDeclaredNames(node.Catch));
      }
      if (node.Finally) {
        names.push(...VarDeclaredNames(node.Finally));
      }
      return names;
    }
    case 'Script':
      if (node.ScriptBody) {
        return VarDeclaredNames(node.ScriptBody);
      }
      return [];
    case 'ScriptBody':
      return TopLevelVarDeclaredNames(node.StatementList);
    case 'FunctionBody':
    case 'GeneratorBody':
    case 'AsyncFunctionBody':
    case 'AsyncGeneratorBody':
      return TopLevelVarDeclaredNames(node.FunctionStatementList);
    default:
      return [];
  }
}
