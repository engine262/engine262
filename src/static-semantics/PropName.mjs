import { OutOfRange } from '../helpers.mjs';

export function PropName(node) {
  switch (node.type) {
    case 'PropertyName':
      return node.name;
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncGeneratorMethod':
    case 'AsyncMethod':
      return PropName(node.PropertyName);
    case 'ClassElement':
      if (node.MethodDefinition === null) {
        return undefined;
      }
      return PropName(node.MethodDefinition);
    default:
      throw new OutOfRange('PropName', node);
  }
}
