import type { ParseNode } from '#self';

export type TargetSymbol = ParseNode['type'] | 'super' | 'this';

export function Contains(node: ParseNode, symbol: TargetSymbol): boolean {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'GeneratorDeclaration':
    case 'GeneratorExpression':
    case 'AsyncGeneratorDeclaration':
    case 'AsyncGeneratorExpression':
    case 'AsyncFunctionDeclaration':
    case 'AsyncFunctionExpression':
      return false;
    case 'ClassTail': {
      // We don't have ClassBody?
      throw new Error('TODO');
    }
    case 'ClassStaticBlock':
      return false;
    case 'ArrowFunction':
    case 'AsyncArrowFunction':
      throw new Error('TODO');
    case 'PropertyDefinition':
      throw new Error('TODO');
    //  LiteralPropertyName : IdentifierName
    // throw new Error('TODO');
    case 'MemberExpression': {
      //  MemberExpression : MemberExpression . IdentifierName
      if (node.IdentifierName) {
        return Contains(node.MemberExpression, symbol);
      }
      break;
    }
    case 'SuperProperty': {
      if (node.IdentifierName) {
        return symbol === 'super';
      }
      break;
    }
    case 'CallExpression': {
      throw new Error('TODO');
    }
    case 'OptionalChain': {
      if (node.IdentifierName) {
        //  OptionalChain : OptionalChain . IdentifierName
        if (node.OptionalChain) {
          return Contains(node.OptionalChain, symbol);
        }
        //  OptionalChain : ?. IdentifierName
        return false;
      }
      break;
    }
    default:
  }

  // 1. For each child node child of this Parse Node
  for (const possibleChildKey in node) {
    if (Object.hasOwn(node, possibleChildKey)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const possibleChild = (node as any)[possibleChildKey];
      if ('type' in possibleChild) {
        // a. If child is an instance of symbol, return true.
        if (possibleChild.type === symbol) {
          return true;
        }
        // b. If child is an instance of a nonterminal, then
        const contained = Contains(possibleChild, symbol);
        // i. If contained is true, return true.
        if (contained) {
          return true;
        }
      }
    }
  }
  return false;
}
