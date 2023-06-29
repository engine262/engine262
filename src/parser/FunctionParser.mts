import { IsSimpleParameterList } from '../static-semantics/all.mjs';
import type { Mutable } from '../helpers.mjs';
import { getDeclarations, type ArrowInfo } from './Scope.mjs';
import { Token } from './tokens.mjs';
import { IdentifierParser } from './IdentifierParser.mjs';
import type { ParseNode } from './ParseNode.mjs';

export enum FunctionKind {
  NORMAL = 0,
  ASYNC = 1,
}

interface ArrowParameterConversions {
  'IdentifierReference': ParseNode.SingleNameBinding;
  'BindingRestElement': ParseNode.BindingRestElement;
  'Elision': ParseNode.Elision;
  'ArrayLiteral': ParseNode.BindingElement;
  'ObjectLiteral': ParseNode.BindingElement;
  'AssignmentExpression': ParseNode.SingleNameBinding | ParseNode.BindingElement;
  'CoverInitializedName': ParseNode.SingleNameBinding;
  'PropertyDefinition': ParseNode.BindingRestProperty | ParseNode.BindingProperty;
  'SpreadElement': ParseNode.BindingRestElement;
  'AssignmentRestElement': ParseNode.BindingRestElement;
}

type ConvertArrowParameterResult<T> =
  T extends keyof ArrowParameterConversions ? ArrowParameterConversions[T] : never;

export abstract class FunctionParser extends IdentifierParser {
  abstract parseStatementList(token: string | Token, directives?: string[]): ParseNode.StatementList;
  abstract parseAssignmentExpression(): ParseNode.AssignmentExpressionOrHigher;
  abstract parseBindingElement(): ParseNode.BindingElementLike;
  abstract parseBindingRestElement(): ParseNode.BindingRestElement;

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
    const node = this.startNode<ParseNode.FunctionLike>();
    if (isAsync) {
      this.expect('async');
    }
    this.expect(Token.FUNCTION);
    const isGenerator = this.eat(Token.MUL);
    if (!this.test(Token.LPAREN)) {
      node.BindingIdentifier = this.scope.with({
        await: isExpression ? false : undefined,
        yield: isExpression ? false : undefined,
      }, () => this.parseBindingIdentifier());
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
      // NOTE: since `body` is a union, it is unsound to write to `node` in this fashion
      // @ts-expect-error
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

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}${isExpression ? 'Expression' : 'Declaration'}` as const;
    return this.finishNode(node, name);
  }

  validateFormalParameters(parameters: ParseNode.FormalParameters, body: ParseNode.FunctionBodyLike | ParseNode.ConciseBody | ParseNode.AsyncConciseBody, wantsUnique = false) {
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

  convertArrowParameter<T extends ParseNode>(node: T): ConvertArrowParameterResult<T['type']>;
  convertArrowParameter(node: ParseNode) {
    switch (node.type) {
      case 'IdentifierReference': {
        const BindingIdentifier = this.repurpose(node, 'BindingIdentifier');
        const SingleNameBinding = this.startNode<ParseNode.SingleNameBinding>(node);
        SingleNameBinding.BindingIdentifier = BindingIdentifier;
        SingleNameBinding.Initializer = null;
        this.scope.declare(node, 'parameter');
        return this.finishNode(SingleNameBinding, 'SingleNameBinding');
      }
      case 'BindingRestElement':
        this.scope.declare(node, 'parameter');
        return node;
      case 'Elision':
        return node;
      case 'ArrayLiteral': {
        const BindingPattern = this.repurpose(node, 'ArrayBindingPattern', (asNew, asOld, asPartial) => {
          const BindingElementList: Mutable<ParseNode.BindingElementList> = [];
          asNew.BindingElementList = BindingElementList;
          for (const [i, p] of asOld.ElementList.entries()) {
            const c = this.convertArrowParameter(p);
            if (c.type === 'BindingRestElement') {
              if (i !== asOld.ElementList.length - 1) {
                this.raiseEarly('UnexpectedToken', c);
              }
              asNew.BindingRestElement = c;
            } else {
              BindingElementList.push(c);
            }
          }
          delete asPartial.ElementList;
        });
        const BindingElement = this.startNode<ParseNode.BindingElement>(node);
        BindingElement.BindingPattern = BindingPattern;
        BindingElement.Initializer = null;
        return this.finishNode(BindingElement, 'BindingElement');
      }
      case 'ObjectLiteral': {
        const BindingPattern = this.repurpose(node, 'ObjectBindingPattern', (asNew, asOld, asPartial) => {
          const BindingPropertyList: Mutable<ParseNode.BindingPropertyList> = [];
          asNew.BindingPropertyList = BindingPropertyList;
          for (const p of asOld.PropertyDefinitionList) {
            const c = this.convertArrowParameter(p);
            if (c.type === 'BindingRestProperty') {
              asNew.BindingRestProperty = c;
            } else {
              BindingPropertyList.push(c);
            }
          }
          delete asPartial.PropertyDefinitionList;
        });
        const BindingElement = this.startNode<ParseNode.BindingElement>(node);
        BindingElement.BindingPattern = BindingPattern;
        BindingElement.Initializer = null;
        return this.finishNode(BindingElement, 'BindingElement');
      }
      case 'AssignmentExpression': {
        const result = this.convertArrowParameter(node.LeftHandSideExpression) as ParseNode.Unfinished<ParseNode.SingleNameBinding | ParseNode.BindingElement>;
        result.Initializer = node.AssignmentExpression;
        return result as ParseNode.SingleNameBinding | ParseNode.BindingElement;
      }
      case 'CoverInitializedName': {
        const SingleNameBinding = this.repurpose(node, 'SingleNameBinding', (asNew, asOld, asPartial) => {
          asNew.BindingIdentifier = this.repurpose(asOld.IdentifierReference, 'BindingIdentifier');
          delete asPartial.IdentifierReference;
        });
        this.scope.declare(SingleNameBinding, 'parameter');
        return SingleNameBinding;
      }
      case 'PropertyDefinition': {
        let BindingProperty: ParseNode.BindingProperty | ParseNode.BindingRestProperty;
        if (node.PropertyName === null) {
          BindingProperty = this.repurpose(node, 'BindingRestProperty', (asNew, asOld, asPartial) => {
            asNew.BindingIdentifier = this.repurpose(asOld.AssignmentExpression, 'BindingIdentifier');
            delete asPartial.AssignmentExpression;
          });
        } else {
          BindingProperty = this.repurpose(node, 'BindingProperty', (asNew, asOld, asPartial) => {
            asNew.BindingElement = this.convertArrowParameter(asOld.AssignmentExpression);
            delete asPartial.AssignmentExpression;
          });
        }
        this.scope.declare(node, 'parameter');
        return BindingProperty;
      }
      case 'SpreadElement':
      case 'AssignmentRestElement': {
        const BindingRestElement = this.repurpose(node, 'BindingRestElement', (asNew, asOld, asPartial) => {
          const { AssignmentExpression } = asOld;
          if (AssignmentExpression.type === 'AssignmentExpression') {
            this.raiseEarly('UnexpectedToken', node);
          } else if (AssignmentExpression.type === 'IdentifierReference') {
            asNew.BindingIdentifier = this.repurpose(AssignmentExpression, 'BindingIdentifier');
          } else {
            asNew.BindingPattern = this.convertArrowParameter(AssignmentExpression).BindingPattern;
          }
          delete asPartial.AssignmentExpression;
        });
        this.scope.declare(BindingRestElement, 'parameter');
        return BindingRestElement;
      }
      default:
        this.raiseEarly('UnexpectedToken', node);
        return node;
    }
  }

  parseArrowFunction(node: ParseNode.Unfinished<ParseNode.ArrowFunction | ParseNode.AsyncArrowFunction>, { arrowInfo, Arguments }: { arrowInfo?: ArrowInfo, Arguments: ParseNode.CoverParenthesizedExpressionAndArrowParameterList['Arguments'] }, kind: FunctionKind): ParseNode.ArrowFunction | ParseNode.AsyncArrowFunction {
    const isAsync = kind === FunctionKind.ASYNC;
    this.expect(Token.ARROW);
    if (arrowInfo) {
      arrowInfo.awaitExpressions.forEach((e) => {
        this.raiseEarly('AwaitInFormalParameters', e);
      });
      arrowInfo.yieldExpressions.forEach((e) => {
        this.raiseEarly('YieldInFormalParameters', e);
      });
      if (isAsync) {
        arrowInfo.awaitIdentifiers.forEach((e) => {
          this.raiseEarly('AwaitInFormalParameters', e);
        });
      }
    }
    this.scope.with({
      default: false,
      lexical: true,
      variable: true,
    }, () => {
      node.ArrowParameters = this.scope.with({
        parameters: true,
      }, () => Arguments.map((p) => this.convertArrowParameter(p)));
      const body = this.parseConciseBody(isAsync);
      this.validateFormalParameters(node.ArrowParameters, body, true);
      // NOTE: since `body` is a union, it is unsound to write to `node` in this fashion
      // @ts-expect-error
      node[`${isAsync ? 'Async' : ''}ConciseBody`] = body;
    });
    return this.finishNode(node, `${isAsync ? 'Async' : ''}ArrowFunction`);
  }

  parseConciseBody(isAsync: boolean): ParseNode.ConciseBody | ParseNode.FunctionBody | ParseNode.AsyncConciseBody | ParseNode.AsyncFunctionBody {
    if (this.test(Token.LBRACE)) {
      return this.parseFunctionBody(isAsync, false, true) as ParseNode.FunctionBody | ParseNode.AsyncFunctionBody;
    }
    const asyncBody = this.startNode<ParseNode.ConciseBody | ParseNode.AsyncConciseBody>();
    const exprBody = this.startNode<ParseNode.ExpressionBody>();
    this.scope.with({ await: isAsync }, () => {
      exprBody.AssignmentExpression = this.parseAssignmentExpression();
    });
    asyncBody.ExpressionBody = this.finishNode(exprBody, 'ExpressionBody');
    return this.finishNode(asyncBody, `${isAsync ? 'Async' : ''}ConciseBody`);
  }

  // FormalParameter : BindingElement
  parseFormalParameter(): ParseNode.FormalParameter {
    return this.parseBindingElement() as ParseNode.FormalParameter;
  }

  parseFormalParameters(): ParseNode.FormalParameters {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return [];
    }
    const params: Mutable<ParseNode.FormalParameters> = [];
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

  parseUniqueFormalParameters(): ParseNode.UniqueFormalParameters {
    return this.parseFormalParameters() as ParseNode.UniqueFormalParameters;
  }

  parseFunctionBody(isAsync: boolean, isGenerator: boolean, isArrow: boolean): ParseNode.FunctionBodyLike {
    const node = this.startNode<ParseNode.FunctionBodyLike>();
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
    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body` as const;
    return this.finishNode(node, name);
  }
}
