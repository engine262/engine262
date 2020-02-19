export function ModuleRequests(node) {
  switch (node.type) {
    case 'Module':
      if (node.ModuleBody === null) {
        return [];
      }
      return ModuleRequests(node.ModuleBody);
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
      if (node.FromClause !== null) {
        return ModuleRequests(node.FromClause);
      }
      return [];
    default:
      return [];
  }
}
