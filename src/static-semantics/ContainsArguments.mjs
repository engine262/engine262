// #sec-static-semantics-containsarguments
export function ContainsArguments(node) {
  switch (node.type) {
    case 'IdentifierReference':
      if (node.name === 'arguments') {
        return node;
      }
      return null;
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'GeneratorDeclaration':
    case 'GeneratorExpression':
    case 'AsyncMethod':
    case 'AsyncFunctionDeclaration':
    case 'AsyncFunctionExpression':
      return null;
    default:
      for (const value of Object.values(node)) {
        if ((value?.type || Array.isArray(value))) {
          const maybe = ContainsArguments(value);
          if (maybe) {
            return maybe;
          }
        }
      }
      return null;
  }
}
