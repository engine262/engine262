import { Token } from './tokens.mjs';
import { IdentifierParser } from './IdentifierParser.mjs';

const ScopeBits = {
  RETURN: 0b0001,
  AWAIT: 0b0010,
  YIELD: 0b0100,
  SUPER: 0b1000,
};

const FunctionKind = {
  NORMAL: 0,
  ASYNC: 1,
};

export class FunctionParser extends IdentifierParser {
  isReturnScope() {
    return (this.state.scopeBits & ScopeBits.RETURN) !== 0;
  }

  isAwaitScope() {
    return (this.state.scopeBits & ScopeBits.AWAIT) !== 0;
  }

  isYieldScope() {
    return (this.state.scopeBits & ScopeBits.YIELD) !== 0;
  }

  isSuperScope() {
    return (this.state.scopeBits & ScopeBits.SUPER) !== 0;
  }

  parseFunction(isExpression, kind) {
    const node = this.startNode();
    if (kind === FunctionKind.ASYNC) {
      this.expect(Token.ASYNC);
    }
    this.expect(Token.FUNCTION);
    node.expression = isExpression;
    node.generator = this.eat(Token.MUL);
    node.async = kind === FunctionKind.ASYNC;
    if (this.test(Token.IDENTIFIER)) {
      node.id = this.parseBindingIdentifier();
    } else if (isExpression === false) {
      this.error('Missing function name');
    } else {
      node.id = null;
    }
    node.params = this.parseFormalParameters();
    node.body = this.parseFunctionBody(node.async, node.generator);
    return this.finishNode(node, isExpression ? 'FunctionExpression' : 'FunctionDeclaration');
  }

  parseArrowFunction(node, parameters, isAsync) {
    this.expect(Token.ARROW);
    node.id = null;
    node.expression = true;
    node.generator = false;
    node.async = isAsync;
    node.params = parameters;
    node.body = this.test(Token.LBRACE)
      ? this.parseFunctionBody(isAsync, false)
      : this.parseExpression();
    return this.finishNode(node, 'ArrowFunctionExpression');
  }

  parseFormalParameters() {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return [];
    }
    const params = [];
    while (true) {
      const node = this.startNode();
      if (this.eat(Token.ELLIPSIS)) {
        node.argument = this.parseBindingIdentifier();
        params.push(this.finishNode(node, 'RestElement'));
        this.expect(Token.RPAREN);
        break;
      } else {
        params.push(this.parseBindingIdentifier());
      }
      if (this.eat(Token.RPAREN)) {
        break;
      }
      this.expect(Token.COMMA);
      if (this.eat(Token.RPAREN)) {
        break;
      }
    }
    return params;
  }

  parseFunctionBody(isAsync, isGenerator) {
    const saved = this.state.scopeBits;
    this.state.scopeBits |= ScopeBits.RETURN;
    if (isAsync) {
      this.state.scopeBits |= ScopeBits.AWAIT;
    }
    if (isGenerator) {
      this.state.scopeBits |= ScopeBits.YIELD;
    }
    this.expect(Token.LBRACE);
    const node = this.startNode();
    const directives = [];
    node.body = this.parseStatementList(Token.RBRACE, directives);
    this.state.scopeBits = saved;
    return this.finishNode(node, 'BlockStatement');
  }
}

FunctionParser.FunctionKind = FunctionKind;
FunctionParser.ScopeBits = ScopeBits;
