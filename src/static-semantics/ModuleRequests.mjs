export function ModuleRequests(node) {
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody) {
        return ModuleRequests(node.ModuleBody);
      }
      return [];
    case 'ModuleBody': {
      const moduleNames = [];
      for (const item of node.ModuleItemList) {
        moduleNames.push(...ModuleRequests(item));
      }
      return moduleNames;
    }
    case 'ImportDeclaration':
      return ModuleRequests(node.FromClause);
    case 'ExportDeclaration':
      if (node.FromClause) {
        return ModuleRequests(node.FromClause);
      }
      return [];
    default:
      return [];
  }
}
