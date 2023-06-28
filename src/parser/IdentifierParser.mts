import {
  Token,
  isKeyword,
  isReservedWordStrict,
  isKeywordRaw,
} from './tokens.mjs';
import { BaseParser } from './BaseParser.mjs';
import type { ParseNode } from './ParseNode.mjs';
import { type Locatable } from './Lexer.mjs';

export abstract class IdentifierParser extends BaseParser {
  // IdentifierName
  parseIdentifierName() {
    const node = this.startNode<ParseNode.IdentifierName>();
    const p = this.peek();
    if (p.type === Token.IDENTIFIER
        || p.type === Token.ESCAPED_KEYWORD
        || isKeyword(p.type)) {
      node.name = this.next().valueAsString();
    } else {
      this.unexpected();
    }
    return this.finishNode(node, 'IdentifierName');
  }

  // BindingIdentifier :
  //   Identifier
  //   `yield`
  //   `await`
  parseBindingIdentifier() {
    const node = this.startNode<ParseNode.BindingIdentifier>();
    const token = this.next();
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.valueAsString();
        break;
      case Token.ESCAPED_KEYWORD:
        node.name = token.valueAsString();
        break;
      case Token.YIELD:
        node.name = 'yield';
        break;
      case Token.AWAIT:
        node.name = 'await';
        for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
          const arrowInfo = this.scope.arrowInfoStack[i];
          if (!arrowInfo) {
            break;
          }
          if (arrowInfo.isAsync) {
            arrowInfo.awaitIdentifiers.push(node as ParseNode.BindingIdentifier);
            break;
          }
        }
        break;
      default:
        this.unexpected(token);
    }
    if (this.isStrictMode() && (node.name === 'eval' || node.name === 'arguments')) {
      this.raiseEarly('UnexpectedEvalOrArguments', token);
    }
    this.validateIdentifierReference(node.name, token);
    return this.finishNode(node, 'BindingIdentifier');
  }

  // IdentifierReference :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  parseIdentifierReference() {
    const node = this.startNode<ParseNode.IdentifierReference>();
    const token = this.next();
    node.escaped = token.escaped;
    switch (token.type) {
      case Token.IDENTIFIER:
        node.name = token.valueAsString();
        break;
      case Token.ESCAPED_KEYWORD:
        node.name = token.valueAsString();
        break;
      case Token.YIELD:
        if (this.scope.hasYield()) {
          this.unexpected(token);
        }
        node.name = 'yield';
        break;
      case Token.AWAIT:
        if (this.scope.hasAwait()) {
          this.unexpected(token);
        }
        for (let i = 0; i < this.scope.arrowInfoStack.length; i += 1) {
          const arrowInfo = this.scope.arrowInfoStack[i];
          if (!arrowInfo) {
            break;
          }
          if (arrowInfo.isAsync) {
            arrowInfo.awaitIdentifiers.push(node as ParseNode.IdentifierReference);
            break;
          }
        }
        node.name = 'await';
        break;
      default:
        this.unexpected(token);
    }
    this.validateIdentifierReference(node.name, token);
    return this.finishNode(node, 'IdentifierReference');
  }

  validateIdentifierReference(name: string, token: Locatable) {
    if (name === 'yield' && (this.scope.hasYield() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (name === 'await' && (this.scope.hasAwait() || this.scope.isModule())) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (this.isStrictMode() && isReservedWordStrict(name)) {
      this.raiseEarly('UnexpectedReservedWordStrict', token);
    }
    if (this.scope.inClassStaticBlock() && name === 'arguments') {
      this.raiseEarly('UnexpectedEvalOrArguments', token);
    }
    if (name !== 'yield' && name !== 'await' && isKeywordRaw(name)) {
      this.raiseEarly('UnexpectedToken', token);
    }
  }

  // LabelIdentifier :
  //   Identifier
  //   [~Yield] `yield`
  //   [~Await] `await`
  parseLabelIdentifier() {
    const node = this.parseIdentifierReference();
    return this.repurpose(node, 'LabelIdentifier') as ParseNode.LabelIdentifier;
  }

  // PrivateIdentifier ::
  //   `#` IdentifierName
  parsePrivateIdentifier() {
    const node = this.startNode<ParseNode.PrivateIdentifier>();
    node.name = this.expect(Token.PRIVATE_IDENTIFIER).valueAsString();
    return this.finishNode(node, 'PrivateIdentifier');
  }
}
