import { IsSimpleParameterList } from '../static-semantics/all.mjs';
import { ArrowInfoStack, getDeclarations } from './Scope.mjs';
import { Token } from './tokens.mjs';
import { IdentifierParser } from './IdentifierParser.mjs';
import type { ParseNode } from './Parser.mjs';

export enum FunctionKind {
  NORMAL = 0,
  ASYNC = 1,
}

export abstract class FunctionParser extends IdentifierParser {
  abstract parseStatementList(endToken: number, directives?: readonly string[]): ParseNode[];
  abstract parseAssignmentExpression(): ParseNode;
  abstract parseBindingElement(): ParseNode;
  abstract parseBindingRestElement(): ParseNode;
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
  parseFunction(isExpression: boolean, kind: FunctionKind) {
    const isAsync = kind === FunctionKind.ASYNC;
    const node = this.startNode();
    if (isAsync) {
      this.expect('async');
    }
    this.expect(Token.FUNCTION);
    const isGenerator = this.eat(Token.MUL);
    if (!this.test(Token.LPAREN)) {
      this.scope.with({
        await: isExpression ? false : undefined,
        yield: isExpression ? false : undefined,
      }, () => {
        node.BindingIdentifier = this.parseBindingIdentifier();
      });
      if (!isExpression) {
        this.scope.declare(node.BindingIdentifier, 'function');
      }
    } else if (isExpression === false && !this.scope.isDefault()) {
      this.unexpected();
    } else {
      node.BindingIdentifier = null;
    }

    this.scope.with({
      default: false,
      await: isAsync,
      yield: isGenerator,
      lexical: true,
      variable: true,
      variableFunctions: true,
      parameters: false,
      classStaticBlock: false,
    }, () => {
      this.scope.arrowInfoStack.push(null);

      node.FormalParameters = this.parseFormalParameters();

      const body = this.parseFunctionBody(isAsync, isGenerator, false);
      node[body.type] = body;

      if (node.BindingIdentifier) {
        if (body.strict && (node.BindingIdentifier.name === 'eval' || node.BindingIdentifier.name === 'arguments')) {
          this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
        }
        if (isExpression) {
          if (this.scope.hasYield() && node.BindingIdentifier.name === 'yield') {
            this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
          }
          if (this.scope.hasAwait() && node.BindingIdentifier.name === 'await') {
            this.raiseEarly('UnexpectedToken', node.BindingIdentifier);
          }
        }
      }

      this.validateFormalParameters(node.FormalParameters, body);

      this.scope.arrowInfoStack.pop();
    });

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}${isExpression ? 'Expression' : 'Declaration'}`;
    return this.finishNode(node, name);
  }

  validateFormalParameters(parameters: readonly ParseNode[], body: ParseNode, wantsUnique = false) {
    const isStrict = body.strict;
    const hasStrictDirective = body.directives && body.directives.includes('use strict');
    if (wantsUnique === false && !IsSimpleParameterList(parameters)) {
      wantsUnique = true;
    }

    if (hasStrictDirective) {
      parameters.forEach((p) => {
        if (p.type !== 'SingleNameBinding' || p.Initializer) {
          this.raiseEarly('UseStrictNonSimpleParameter', p);
        }
      });
    }

    const names = new Set();
    getDeclarations(parameters)
      .forEach((d) => {
        if (isStrict) {
          if (d.name === 'arguments' || d.name === 'eval') {
            this.raiseEarly('UnexpectedToken', d.node);
          }
        }
        if (isStrict || wantsUnique) {
          if (names.has(d.name)) {
            this.raiseEarly('AlreadyDeclared', d.node, d.name);
          } else {
            names.add(d.name);
          }
        }
      });
  }

  convertArrowParameter(node: ParseNode): ParseNode {
    switch (node.type) {
      case 'IdentifierReference': {
        node.type = 'BindingIdentifier';
        const container = this.startNode();
        container.BindingIdentifier = node;
        container.Initializer = null;
        this.scope.declare(node, 'parameter');
        return this.finishNode(container, 'SingleNameBinding');
      }
      case 'BindingRestElement':
        this.scope.declare(node, 'parameter');
        return node;
      case 'Elision':
        return node;
      case 'ArrayLiteral': {
        const wrap = this.startNode();
        node.BindingElementList = [];
        node.ElementList.forEach((p: ParseNode, i: number) => {
          const c = this.convertArrowParameter(p);
          if (c.type === 'BindingRestElement') {
            if (i !== node.ElementList.length - 1) {
              this.raiseEarly('UnexpectedToken', c);
            }
            node.BindingRestElement = c;
          } else {
            node.BindingElementList.push(c);
          }
        });
        delete node.ElementList;
        node.type = 'ArrayBindingPattern';
        wrap.BindingPattern = node;
        wrap.Initializer = null;
        return this.finishNode(wrap, 'BindingElement');
      }
      case 'ObjectLiteral': {
        const wrap = this.startNode();
        node.BindingPropertyList = [];
        node.PropertyDefinitionList.forEach((p: ParseNode) => {
          const c = this.convertArrowParameter(p);
          if (c.type === 'BindingRestProperty') {
            node.BindingRestProperty = c;
          } else {
            node.BindingPropertyList.push(c);
          }
        });
        delete node.PropertyDefinitionList;
        node.type = 'ObjectBindingPattern';
        wrap.BindingPattern = node;
        wrap.Initializer = null;
        return this.finishNode(wrap, 'BindingElement');
      }
      case 'AssignmentExpression': {
        const result = this.convertArrowParameter(node.LeftHandSideExpression);
        result.Initializer = node.AssignmentExpression;
        return result;
      }
      case 'CoverInitializedName':
        node.type = 'SingleNameBinding';
        node.BindingIdentifier = node.IdentifierReference;
        node.BindingIdentifier.type = 'BindingIdentifier';
        delete node.IdentifierReference;
        this.scope.declare(node, 'parameter');
        return node;
      case 'PropertyDefinition':
        if (node.PropertyName === null) {
          node.type = 'BindingRestProperty';
          node.BindingIdentifier = node.AssignmentExpression;
          node.BindingIdentifier.type = 'BindingIdentifier';
        } else {
          node.type = 'BindingProperty';
          node.BindingElement = this.convertArrowParameter(node.AssignmentExpression);
        }
        this.scope.declare(node, 'parameter');
        delete node.AssignmentExpression;
        return node;
      case 'SpreadElement':
      case 'AssignmentRestElement':
        node.type = 'BindingRestElement';
        if (node.AssignmentExpression.type === 'AssignmentExpression') {
          this.raiseEarly('UnexpectedToken', node);
        } else if (node.AssignmentExpression.type === 'IdentifierReference') {
          node.BindingIdentifier = node.AssignmentExpression;
          node.BindingIdentifier.type = 'BindingIdentifier';
        } else {
          node.BindingPattern = this.convertArrowParameter(node.AssignmentExpression).BindingPattern;
        }
        this.scope.declare(node, 'parameter');
        delete node.AssignmentExpression;
        return node;
      default:
        this.raiseEarly('UnexpectedToken', node);
        return node;
    }
  }

  parseArrowFunction(node: ParseNode, { arrowInfo, Arguments }: ParseNode | { arrowInfo?: ArrowInfoStack, Arguments: readonly ParseNode[] }, kind: FunctionKind) {
    const isAsync = kind === FunctionKind.ASYNC;
    this.expect(Token.ARROW);
    const _arrowInfo = arrowInfo as ArrowInfoStack;
    if (_arrowInfo) {
      _arrowInfo.awaitExpressions.forEach((e) => {
        this.raiseEarly('AwaitInFormalParameters', e);
      });
      _arrowInfo.yieldExpressions.forEach((e) => {
        this.raiseEarly('YieldInFormalParameters', e);
      });
      if (isAsync) {
        _arrowInfo.awaitIdentifiers.forEach((e) => {
          this.raiseEarly('AwaitInFormalParameters', e);
        });
      }
    }
    this.scope.with({
      default: false,
      lexical: true,
      variable: true,
    }, () => {
      this.scope.with({
        parameters: true,
      }, () => {
        node.ArrowParameters = Arguments.map((p: ParseNode) => this.convertArrowParameter(p));
      });
      const body = this.parseConciseBody(isAsync);
      this.validateFormalParameters(node.ArrowParameters, body, true);
      node[`${isAsync ? 'Async' : ''}ConciseBody`] = body;
    });
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
  }

  parseConciseBody(isAsync: boolean) {
    if (this.test(Token.LBRACE)) {
      return this.parseFunctionBody(isAsync, false, true);
    }
    const asyncBody = this.startNode();
    const exprBody = this.startNode();
    this.scope.with({ await: isAsync }, () => {
      exprBody.AssignmentExpression = this.parseAssignmentExpression();
    });
    asyncBody.ExpressionBody = this.finishNode(exprBody, 'ExpressionBody');
    return this.finishNode(asyncBody, `${isAsync ? 'Async' : ''}ConciseBody`);
  }

  // FormalParameter : BindingElement
  parseFormalParameter() {
    return this.parseBindingElement();
  }

  parseFormalParameters() {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return [];
    }
    const params: ParseNode[] = [];
    this.scope.with({ parameters: true }, () => {
      while (true) {
        if (this.test(Token.ELLIPSIS)) {
          const element = this.parseBindingRestElement();
          this.scope.declare(element, 'parameter');
          params.push(element);
          this.expect(Token.RPAREN);
          break;
        } else {
          const formal = this.parseFormalParameter();
          this.scope.declare(formal, 'parameter');
          params.push(formal);
        }
        if (this.eat(Token.RPAREN)) {
          break;
        }
        this.expect(Token.COMMA);
        if (this.eat(Token.RPAREN)) {
          break;
        }
      }
    });
    return params;
  }

  parseUniqueFormalParameters() {
    return this.parseFormalParameters();
  }

  parseFunctionBody(isAsync: boolean, isGenerator: boolean, isArrow: boolean) {
    const node = this.startNode();
    this.expect(Token.LBRACE);
    this.scope.with({
      newTarget: isArrow ? undefined : true,
      return: true,
      await: isAsync,
      yield: isGenerator,
      label: 'boundary',
    }, () => {
      node.directives = [];
      node.FunctionStatementList = this.parseStatementList(Token.RBRACE, node.directives);
      node.strict = node.strict || node.directives.includes('use strict');
    });
    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`;
    return this.finishNode(node, name);
  }
}
