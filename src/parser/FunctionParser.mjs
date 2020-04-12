import { Token } from './tokens.mjs';
import { IdentifierParser } from './IdentifierParser.mjs';

export const FunctionKind = {
  NORMAL: 0,
  ASYNC: 1,
};

export class FunctionParser extends IdentifierParser {
  // FunctionDeclaration :
  //   `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `function` `(` FormalParameters `)` `{` FunctionBody `}`
  // FunctionExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` FunctionBody `}`
  // GeneratorDeclaration :
  //   `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
  //   [+Default] `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
  // GeneratorExpression :
  //   `function` BindingIdentifier? `(` FormalParameters `)` `{` GeneratorBody `}`
  // AsyncGeneratorDeclaration :
  //   `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  //   [+Default] `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  // AsyncGeneratorExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
  // AsyncFunctionDeclaration :
  //   `async` `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
  //   [+Default] `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  // Async`FunctionExpression :
  //   `async` `function` BindingIdentifier? `(` FormalParameters `)` `{` AsyncFunctionBody `}`
  parseFunction(isExpression, kind) {
    const isAsync = kind === FunctionKind.ASYNC;
    const node = this.startNode();
    if (isAsync) {
      this.expect(Token.ASYNC);
    }
    this.expect(Token.FUNCTION);
    const isGenerator = this.eat(Token.MUL);
    if (this.test(Token.IDENTIFIER)) {
      node.BindingIdentifier = this.parseBindingIdentifier();
    } else if (isExpression === false) {
      this.unexpected();
    } else {
      node.BindingIdentifier = null;
    }

    node.FormalParameters = this.parseFormalParameters();

    const body = this.parseFunctionBody(isAsync, isGenerator);
    node[body.type] = body;

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}${isExpression ? 'Expression' : 'Declaration'}`;
    return this.finishNode(node, name);
  }

  parseArrowFunction(node, parameters, isAsync) {
    this.expect(Token.ARROW);
    node.ArrowParameters = parameters;
    const body = this.parseConciseBody(isAsync);
    node[body.type] = body;
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
  }

  parsePropertyName() {
    if (this.eat(Token.LBRACK)) {
      const e = this.parseAssignmentExpression();
      this.expect(Token.RBRACK);
      return e;
    }
    return this.parseIdentifierName();
  }

  parseConciseBody(isAsync) {
    const node = this.startNode();
    if (this.test(Token.LBRACE)) {
      node.ExpressionBody = null;
      node.FunctionBody = this.parseFunctionBody(isAsync, false);
    } else {
      node.ExpressionBody = this.parseAssignmentExpression();
      node.FunctionBody = null;
    }
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ConciseBody`);
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

  parseUniqueFormalParameters() {
    return this.parseFormalParameters();
  }

  parseFunctionBody(isAsync, isGenerator) {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    this.scope({
      return: true,
      async: isAsync,
      yield: isGenerator,
    }, () => {
      node.FunctionStatementList = this.parseStatementList(Token.RBRACE);
    });
    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`;
    return this.finishNode(node, name);
  }
}
