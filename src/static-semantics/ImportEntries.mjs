export function ImportEntries(node) {
  switch (node.type) {
    case 'Module':
      if (module.ModuleBody === null) {
        return [];
      }
      return ImportEntries(node.ModuleBody);
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
