export function PropName(node) {
  switch (node.type) {
    case 'IdentifierName':
      return node.name;
    case 'StringLiteral':
      return node.value;
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncGeneratorMethod':
    case 'AsyncMethod':
      return PropName(node.PropertyName);
    case 'ClassElement':
      if (node.MethodDefinition) {
        return PropName(node.MethodDefinition);
      }
      return undefined;
    default:
      return undefined;
  }
}
