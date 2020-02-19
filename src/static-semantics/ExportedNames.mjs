import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';
import { BoundNames } from './all.mjs';

export function ExportedNames(node) {
  if (Array.isArray(node)) {
    const names = [];
    for (const item of node) {
      names.push(...ExportedNames(item));
    }
    return names;
  }
  switch (node.type) {
    case 'ExportDeclaration':
      if (node.default) {
        return [new Value('default')];
      }
      if (node.ExportFromClause) {
        return ExportedNames(node.ExportFromClause);
      }
      if (node.VariableStatement) {
        return BoundNames(node.VariableStatement);
      }
      if (node.Declaration) {
        return BoundNames(node.Declaration);
      }
      if (node.NamedExports) {
        return [];
      }
      throw new OutOfRange('ExportedNames', node);
    default:
      return [];
  }
}
