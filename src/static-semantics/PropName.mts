import type { ParseNode } from '../parser/ParseNode.mts';

export function PropName(node: ParseNode): string | undefined {
  switch (node.type) {
    case 'IdentifierName':
      return node.name;
    case 'StringLiteral':
      return node.value;
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncGeneratorMethod':
    case 'AsyncMethod':
    case 'FieldDefinition':
      return PropName(node.ClassElementName);
    default:
      return undefined;
  }
}
