export function ImportEntries(node) {
  switch (node.type) {
    case 'Module':
      if (module.ModuleBody) {
        return ImportEntries(node.ModuleBody);
      }
      return [];
    case 'ModuleBody': {
      const entries = [];
      for (const item of node.ModuleItemList) {
        entries.push(...ImportEntries(item));
      }
      return entries;
    }
    case 'ImportDeclaration':
      throw new Error();
    default:
      return [];
  }
}
