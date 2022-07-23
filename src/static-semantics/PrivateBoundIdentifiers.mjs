import { StringValue } from './all.mjs';

// #sec-static-semantics-privateboundidentifiers
export function PrivateBoundIdentifiers(node) {
  if (Array.isArray(node)) {
    return node.flatMap((n) => PrivateBoundIdentifiers(n));
  }
  switch (node.type) {
    case 'PrivateIdentifier':
      return [StringValue(node)];
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncMethod':
    case 'AsyncGeneratorMethod':
    case 'FieldDefinition':
      return PrivateBoundIdentifiers(node.ClassElementName);
    default:
      return [];
  }
}
