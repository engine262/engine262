import {
  TV,
  PropName,
  StringValue,
  IsComputedPropertyKey,
  ContainsArguments,
} from '../static-semantics/all.mjs';
import {
  Token, TokenPrecedence,
  isPropertyOrCall,
  isMember,
  isKeywordRaw,
  isAutomaticSemicolon,
} from './tokens.mjs';
import { isLineTerminator, type TokenData } from './Lexer.mjs';
import { FunctionParser, FunctionKind } from './FunctionParser.mjs';
import { RegExpParser } from './RegExpParser.mjs';
import type { ParseNode } from './ParseNode.mjs';

export abstract class ExpressionParser extends FunctionParser {
  abstract state: {
    hasTopLevelAwait: boolean;
    strict: boolean;
    json: boolean;
  };
  abstract parseBindingPattern(): ParseNode.BindingPattern;
  abstract markNodeStart(node: ParseNode | ParseNode.Unfinished<ParseNode>): void;
  abstract parseInitializerOpt(): ParseNode.Initializer | null;
  abstract semicolon(): void;

  // Expression :
  //   AssignmentExpression
  //   Expression `,` AssignmentExpression
  parseExpression(): ParseNode.Expression {
    const AssignmentExpression = this.parseAssignmentExpression();
    if (this.eat(Token.COMMA)) {
      const CommaOperator = this.startNode<ParseNode.CommaOperator>(AssignmentExpression);
      CommaOperator.ExpressionList = [AssignmentExpression];
      do {
        CommaOperator.ExpressionList.push(this.parseAssignmentExpression());
      } while (this.eat(Token.COMMA));
      return this.finishNode(CommaOperator, 'CommaOperator');
    }
    return AssignmentExpression;
  }

  // AssignmentExpression :
  //   ConditionalExpression
  //   [+Yield] YieldExpression
  //   ArrowFunction
  //   AsyncArrowFunction
  //   LeftHandSideExpression `=` AssignmentExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  //   LeftHandSideExpression LogicalAssignmentOperator AssignmentExpression
  //
  // AssignmentOperator : one of
  //   *= /= %= += -= <<= >>= >>>= &= ^= |= **=
  //
  // LogicalAssignmentOperator : one of
  //   &&= ||= ??=
  parseAssignmentExpression(): ParseNode.AssignmentExpressionOrHigher {
    if (this.test(Token.YIELD) && this.scope.hasYield()) {
      return this.parseYieldExpression();
    }

    this.scope.pushAssignmentInfo('assign');
    const left = this.parseConditionalExpression();
    const assignmentInfo = this.scope.popAssignmentInfo();

    if (left.type === 'IdentifierReference') {
      // `async` [no LineTerminator here] IdentifierReference [no LineTerminator here] `=>`
      if (left.name === 'async'
          && this.test(Token.IDENTIFIER)
          && !this.peek().hadLineTerminatorBefore
          && this.testAhead(Token.ARROW)
          && !this.peekAhead().hadLineTerminatorBefore) {
        assignmentInfo.clear();
        const node = this.startNode<ParseNode.AsyncArrowFunction>(left);
        return this.parseArrowFunction(node, {
          Arguments: [this.parseIdentifierReference()],
        }, FunctionKind.ASYNC);
      }
      // IdentifierReference [no LineTerminator here] `=>`
      if (this.test(Token.ARROW) && !this.peek().hadLineTerminatorBefore) {
        assignmentInfo.clear();
        const node = this.startNode<ParseNode.ArrowFunction>(left);
        return this.parseArrowFunction(node, { Arguments: [left] }, FunctionKind.NORMAL);
      }
    }

    // `async` [no LineTerminator here] Arguments [no LineTerminator here] `=>`
    if (left.type === 'CallExpression' && left.arrowInfo && this.test(Token.ARROW)
        && !this.peek().hadLineTerminatorBefore) {
      const last = left.Arguments[left.Arguments.length - 1];
      if (!left.arrowInfo.hasTrailingComma || (last && last.type !== 'AssignmentRestElement')) {
        assignmentInfo.clear();
        const node = this.startNode<ParseNode.AsyncArrowFunction>(left);
        return this.parseArrowFunction(node, left, FunctionKind.ASYNC);
      }
    }

    if (left.type === 'CoverParenthesizedExpressionAndArrowParameterList') {
      assignmentInfo.clear();
      const node = this.startNode<ParseNode.ArrowFunction>(left);
      return this.parseArrowFunction(node, left, FunctionKind.NORMAL);
    }

    switch (this.peek().type) {
      case Token.ASSIGN:
      case Token.ASSIGN_MUL:
      case Token.ASSIGN_DIV:
      case Token.ASSIGN_MOD:
      case Token.ASSIGN_ADD:
      case Token.ASSIGN_SUB:
      case Token.ASSIGN_SHL:
      case Token.ASSIGN_SAR:
      case Token.ASSIGN_SHR:
      case Token.ASSIGN_BIT_AND:
      case Token.ASSIGN_BIT_XOR:
      case Token.ASSIGN_BIT_OR:
      case Token.ASSIGN_EXP:
      case Token.ASSIGN_AND:
      case Token.ASSIGN_OR:
      case Token.ASSIGN_NULLISH: {
        assignmentInfo.clear();
        const node = this.startNode<ParseNode.AssignmentExpression>(left);
        this.validateAssignmentTarget(left);
        node.LeftHandSideExpression = left;
        // NOTE: This cast isn't strictly sound as it depends on an expectation that `this.next.value` is correlated
        //       to `this.peek().type` which cannot be verified by the type system.
        node.AssignmentOperator = this.next().value as ParseNode.AssignmentExpression['AssignmentOperator'];
        node.AssignmentExpression = this.parseAssignmentExpression();
        return this.finishNode(node, 'AssignmentExpression');
      }
      default:
        return left;
    }
  }

  validateAssignmentTarget(node: ParseNode) {
    switch (node.type) {
      case 'IdentifierReference':
        if (this.isStrictMode() && ((node as ParseNode.IdentifierReference).name === 'eval' || (node as ParseNode.IdentifierReference).name === 'arguments')) {
          break;
        }
        return;
      case 'CoverInitializedName':
        this.validateAssignmentTarget((node as ParseNode.CoverInitializedName).IdentifierReference);
        return;
      case 'MemberExpression':
        return;
      case 'SuperProperty':
        return;
      case 'ParenthesizedExpression':
        if ((node as ParseNode.ParenthesizedExpression).Expression.type === 'ObjectLiteral' || (node as ParseNode.ParenthesizedExpression).Expression.type === 'ArrayLiteral') {
          break;
        }
        this.validateAssignmentTarget((node as ParseNode.ParenthesizedExpression).Expression);
        return;
      case 'ArrayLiteral':
        (node as ParseNode.ArrayLiteral).ElementList.forEach((p, i) => {
          if (p.type === 'SpreadElement' && (i !== (node as ParseNode.ArrayLiteral).ElementList.length - 1 || (node as ParseNode.ArrayLiteral).hasTrailingComma)) {
            this.raiseEarly('InvalidAssignmentTarget', p);
          }
          if (p.type === 'AssignmentExpression') {
            this.validateAssignmentTarget(p.LeftHandSideExpression);
          } else {
            this.validateAssignmentTarget(p);
          }
        });
        return;
      case 'ObjectLiteral':
        (node as ParseNode.ObjectLiteral).PropertyDefinitionList.forEach((p, i) => {
          if (p.type === 'PropertyDefinition' && !p.PropertyName
              && i !== (node as ParseNode.ObjectLiteral).PropertyDefinitionList.length - 1) {
            this.raiseEarly('InvalidAssignmentTarget', p);
          }
          this.validateAssignmentTarget(p);
        });
        return;
      case 'PropertyDefinition': {
        const PropertyDefinition = node as ParseNode.PropertyDefinition;
        if (PropertyDefinition.AssignmentExpression.type === 'AssignmentExpression') {
          this.validateAssignmentTarget(PropertyDefinition.AssignmentExpression.LeftHandSideExpression);
        } else {
          this.validateAssignmentTarget(PropertyDefinition.AssignmentExpression);
        }
        return;
      }
      case 'Elision':
        return;
      case 'SpreadElement': {
        const SpreadElement = node as ParseNode.SpreadElement;
        if (SpreadElement.AssignmentExpression.type === 'AssignmentExpression') {
          break;
        }
        this.validateAssignmentTarget(SpreadElement.AssignmentExpression);
        return;
      }
      default:
        break;
    }
    this.raiseEarly('InvalidAssignmentTarget', node);
  }

  // YieldExpression :
  //   `yield`
  //   `yield` [no LineTerminator here] AssignmentExpression
  //   `yield` [no LineTerminator here] `*` AssignmentExpression
  parseYieldExpression(): ParseNode.YieldExpression {
    if (this.scope.inParameters()) {
      this.raiseEarly('YieldInFormalParameters');
    }
    const node = this.startNode<ParseNode.YieldExpression>();
    this.expect(Token.YIELD);
    if (this.peek().hadLineTerminatorBefore) {
      node.hasStar = false;
      node.AssignmentExpression = null;
    } else {
      node.hasStar = this.eat(Token.MUL);
      if (node.hasStar) {
        node.AssignmentExpression = this.parseAssignmentExpression();
      } else {
        switch (this.peek().type) {
          case Token.EOS:
          case Token.SEMICOLON:
          case Token.RBRACE:
          case Token.RBRACK:
          case Token.RPAREN:
          case Token.COLON:
          case Token.COMMA:
          case Token.IN:
            node.AssignmentExpression = null;
            break;
          default:
            node.AssignmentExpression = this.parseAssignmentExpression();
        }
      }
    }
    this.scope.arrowInfo?.yieldExpressions.push(node as ParseNode.YieldExpression);
    return this.finishNode(node, 'YieldExpression');
  }

  // ConditionalExpression :
  //   ShortCircuitExpression
  //   ShortCircuitExpression `?` AssignmentExpression `:` AssignmentExpression
  parseConditionalExpression(): ParseNode.ConditionalExpressionOrHigher {
    const ShortCircuitExpression = this.parseShortCircuitExpression();
    if (this.eat(Token.CONDITIONAL)) {
      const node = this.startNode<ParseNode.ConditionalExpression>(ShortCircuitExpression);
      node.ShortCircuitExpression = ShortCircuitExpression;
      this.scope.with({ in: true }, () => {
        node.AssignmentExpression_a = this.parseAssignmentExpression();
      });
      this.expect(Token.COLON);
      node.AssignmentExpression_b = this.parseAssignmentExpression();
      return this.finishNode(node, 'ConditionalExpression');
    }
    return ShortCircuitExpression;
  }

  // ShortCircuitExpression :
  //   LogicalORExpression
  //   CoalesceExpression
  //
  // CoalesceExpression :
  //   CoalesceExpressionHead `??` BitwiseORExpression
  //
  // CoalesceExpressionHead :
  //   CoalesceExpression
  //   BitwiseORExpression
  parseShortCircuitExpression(): ParseNode.ShortCircuitExpressionOrHigher {
    // Start parse at BIT_OR, right above AND/OR/NULLISH
    const expression = this.parseBinaryExpression(TokenPrecedence[Token.BIT_OR]) as ParseNode.BitwiseORExpressionOrHigher;
    switch (this.peek().type) {
      case Token.AND:
      case Token.OR:
        // Drop into normal binary chain starting at OR
        return this.parseBinaryExpression(TokenPrecedence[Token.OR], expression) as ParseNode.LogicalORExpressionOrHigher;
      case Token.NULLISH: {
        let x: ParseNode.CoalesceExpressionHead = expression;
        while (this.eat(Token.NULLISH)) {
          const node = this.startNode<ParseNode.CoalesceExpression>();
          node.CoalesceExpressionHead = x;
          node.BitwiseORExpression = this.parseBinaryExpression(TokenPrecedence[Token.BIT_OR]) as ParseNode.BitwiseORExpressionOrHigher;
          x = this.finishNode(node, 'CoalesceExpression');
        }
        return x;
      }
      default:
        return expression;
    }
  }

  parseBinaryExpression(precedence: number, x?: ParseNode.BinaryExpressionOrHigher | ParseNode.PrivateIdentifier): ParseNode.BinaryExpressionOrHigher | ParseNode.PrivateIdentifier {
    if (!x) {
      if (this.test(Token.PRIVATE_IDENTIFIER)) {
        x = this.parsePrivateIdentifier();
        const p = TokenPrecedence[this.peek().type];
        if (!this.test(Token.IN) || p < precedence) {
          this.raise('UnexpectedToken');
        }
        this.scope.checkUndefinedPrivate(x);
        return this.parseBinaryExpression(p, x);
      } else {
        x = this.parseUnaryExpression();
      }
    }

    // NOTE: While the algorithm may be efficient, many casts below are inherently unsound as they depend on assumptions
    //       that cannot be proven in the type system without runtime assertions.
    let p = TokenPrecedence[this.peek().type];
    if (p >= precedence) {
      do {
        while (TokenPrecedence[this.peek().type] === p) {
          const left = x;
          if (p === TokenPrecedence[Token.EXP] && (left.type === 'UnaryExpression' || left.type === 'AwaitExpression')) {
            return left;
          }
          let node: ParseNode.Unfinished<ParseNode.BinaryExpression>;
          if (this.peek().type === Token.IN && !this.scope.hasIn()) {
            return left;
          }
          const op = this.next();
          const right = this.parseBinaryExpression(op.type === Token.EXP ? p : p + 1);
          let name: 'ExponentiationExpression'
                  | 'MultiplicativeExpression'
                  | 'AdditiveExpression'
                  | 'ShiftExpression'
                  | 'RelationalExpression'
                  | 'EqualityExpression'
                  | 'BitwiseANDExpression'
                  | 'BitwiseXORExpression'
                  | 'BitwiseORExpression'
                  | 'LogicalANDExpression'
                  | 'LogicalORExpression';
          switch (op.type) {
            case Token.EXP:
              name = 'ExponentiationExpression';
              node = this.startNode<ParseNode.ExponentiationExpression>(left);
              node.UpdateExpression = left as ParseNode.UpdateExpressionOrHigher; // NOTE: unsound cast
              node.ExponentiationExpression = right as ParseNode.ExponentiationExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.MUL:
            case Token.DIV:
            case Token.MOD:
              name = 'MultiplicativeExpression';
              node = this.startNode<ParseNode.MultiplicativeExpression>(left);
              node.MultiplicativeExpression = left as ParseNode.MultiplicativeExpressionOrHigher; // NOTE: unsound cast
              node.MultiplicativeOperator = op.value as ParseNode.MultiplicativeOperator; // NOTE: unsound cast
              node.ExponentiationExpression = right as ParseNode.ExponentiationExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.ADD:
            case Token.SUB:
              name = 'AdditiveExpression';
              node = this.startNode<ParseNode.AdditiveExpression>(left);
              node.AdditiveExpression = left as ParseNode.AdditiveExpressionOrHigher; // NOTE: unsound cast
              node.MultiplicativeExpression = right as ParseNode.MultiplicativeExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.AdditiveExpression['operator']; // NOTE: unsound cast
              break;
            case Token.SHL:
            case Token.SAR:
            case Token.SHR:
              name = 'ShiftExpression';
              node = this.startNode<ParseNode.ShiftExpression>(left);
              node.ShiftExpression = left as ParseNode.ShiftExpressionOrHigher; // NOTE: unsound cast
              node.AdditiveExpression = right as ParseNode.AdditiveExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.ShiftExpression['operator']; // NOTE: unsound cast
              break;
            case Token.LT:
            case Token.GT:
            case Token.LTE:
            case Token.GTE:
            case Token.INSTANCEOF:
            case Token.IN:
              name = 'RelationalExpression';
              node = this.startNode<ParseNode.RelationalExpression>(left);
              if (left.type === 'PrivateIdentifier') {
                node.PrivateIdentifier = left;
              } else {
                node.RelationalExpression = left as ParseNode.RelationalExpressionOrHigher; // NOTE: unsound cast
              }
              node.ShiftExpression = right as ParseNode.ShiftExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.RelationalExpression['operator']; // NOTE: unsound cast
              break;
            case Token.EQ:
            case Token.NE:
            case Token.EQ_STRICT:
            case Token.NE_STRICT:
              name = 'EqualityExpression';
              node = this.startNode<ParseNode.EqualityExpression>(left);
              node.EqualityExpression = left as ParseNode.EqualityExpressionOrHigher; // NOTE: unsound cast
              node.RelationalExpression = right as ParseNode.RelationalExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.EqualityExpression['operator']; // NOTE: unsound cast
              break;
            case Token.BIT_AND:
              name = 'BitwiseANDExpression';
              node = this.startNode<ParseNode.BitwiseANDExpression>(left);
              node.A = left as ParseNode.BitwiseANDExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.BitwiseANDExpression['operator']; // NOTE: unsound cast
              node.B = right as ParseNode.EqualityExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.BIT_XOR:
              name = 'BitwiseXORExpression';
              node = this.startNode<ParseNode.BitwiseXORExpression>(left);
              node.A = left as ParseNode.BitwiseXORExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.BitwiseXORExpression['operator']; // NOTE: unsound cast
              node.B = right as ParseNode.BitwiseANDExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.BIT_OR:
              name = 'BitwiseORExpression';
              node = this.startNode<ParseNode.BitwiseORExpression>(left);
              node.A = left as ParseNode.BitwiseORExpressionOrHigher; // NOTE: unsound cast
              node.operator = op.value as ParseNode.BitwiseORExpression['operator']; // NOTE: unsound cast
              node.B = right as ParseNode.BitwiseXORExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.AND:
              name = 'LogicalANDExpression';
              node = this.startNode<ParseNode.LogicalANDExpression>(left);
              node.LogicalANDExpression = left as ParseNode.LogicalANDExpressionOrHigher; // NOTE: unsound cast
              node.BitwiseORExpression = right as ParseNode.BitwiseORExpressionOrHigher; // NOTE: unsound cast
              break;
            case Token.OR:
              name = 'LogicalORExpression';
              node = this.startNode<ParseNode.LogicalORExpression>(left);
              node.LogicalORExpression = left as ParseNode.LogicalORExpressionOrHigher; // NOTE: unsound cast
              node.LogicalANDExpression = right as ParseNode.LogicalANDExpressionOrHigher; // NOTE: unsound cast
              break;
            default:
              this.unexpected(op);
          }
          x = this.finishNode(node, name);
        }
        p -= 1;
      } while (p >= precedence);
    }
    return x;
  }

  // UnaryExpression :
  //   UpdateExpression
  //   `delete` UnaryExpression
  //   `void` UnaryExpression
  //   `typeof` UnaryExpression
  //   `+` UnaryExpression
  //   `-` UnaryExpression
  //   `~` UnaryExpression
  //   `!` UnaryExpression
  //   [+Await] AwaitExpression
  parseUnaryExpression(): ParseNode.UnaryExpressionOrHigher {
    return this.scope.with({ in: true }, () => {
      if (this.test(Token.AWAIT) && this.scope.hasAwait()) {
        return this.parseAwaitExpression();
      }
      switch (this.peek().type) {
        case Token.DELETE:
        case Token.VOID:
        case Token.TYPEOF:
        case Token.ADD:
        case Token.SUB:
        case Token.BIT_NOT:
        case Token.NOT: {
          const node = this.startNode<ParseNode.UnaryExpression>();
          node.operator = this.next().value as ParseNode.UnaryExpression['operator']; // NOTE: unsound cast
          node.UnaryExpression = this.parseUnaryExpression();
          if (node.operator === 'delete') {
            let target: ParseNode.Expression = node.UnaryExpression;
            while (target.type === 'ParenthesizedExpression') {
              target = target.Expression;
            }
            if (this.isStrictMode() && target.type === 'IdentifierReference') {
              this.raiseEarly('DeleteIdentifier', target);
            }
            if (target.type === 'MemberExpression' && target.PrivateIdentifier) {
              this.raiseEarly('DeletePrivateName', target);
            }
          }
          return this.finishNode(node, 'UnaryExpression');
        }
        default:
          return this.parseUpdateExpression();
      }
    });
  }

  // AwaitExpression : `await` UnaryExpression
  parseAwaitExpression(): ParseNode.AwaitExpression {
    if (this.scope.inParameters()) {
      this.raiseEarly('AwaitInFormalParameters');
    } else if (this.scope.inClassStaticBlock()) {
      this.raiseEarly('AwaitInClassStaticBlock');
    }
    const node = this.startNode<ParseNode.AwaitExpression>();
    this.expect(Token.AWAIT);
    node.UnaryExpression = this.parseUnaryExpression();
    this.scope.arrowInfo?.awaitExpressions.push(node as ParseNode.AwaitExpression);
    if (!this.scope.hasReturn()) {
      this.state.hasTopLevelAwait = true;
    }
    return this.finishNode(node, 'AwaitExpression');
  }

  // UpdateExpression :
  //   LeftHandSideExpression
  //   LeftHandSideExpression [no LineTerminator here] `++`
  //   LeftHandSideExpression [no LineTerminator here] `--`
  //   `++` UnaryExpression
  //   `--` UnaryExpression
  parseUpdateExpression(): ParseNode.UpdateExpressionOrHigher {
    if (this.test(Token.INC) || this.test(Token.DEC)) {
      const node = this.startNode<ParseNode.UpdateExpression>();
      node.operator = this.next().value as ParseNode.UpdateExpression['operator']; // NOTE: unsound cast
      node.LeftHandSideExpression = null;
      node.UnaryExpression = this.parseUnaryExpression();
      this.validateAssignmentTarget(node.UnaryExpression);
      return this.finishNode(node, 'UpdateExpression');
    }
    const argument = this.parseLeftHandSideExpression();
    if (!this.peek().hadLineTerminatorBefore) {
      if (this.test(Token.INC) || this.test(Token.DEC)) {
        this.validateAssignmentTarget(argument);
        const node = this.startNode(argument) as ParseNode.UpdateExpression;
        node.operator = this.next().value as ParseNode.UpdateExpression['operator']; // NOTE: unsound cast
        node.LeftHandSideExpression = argument;
        node.UnaryExpression = null;
        return this.finishNode(node, 'UpdateExpression');
      }
    }
    return argument;
  }

  // LeftHandSideExpression
  parseLeftHandSideExpression(allowCalls = true): ParseNode.LeftHandSideExpression {
    let result: ParseNode.LeftHandSideExpression;
    switch (this.peek().type) {
      case Token.NEW:
        result = this.parseNewExpression();
        break;
      case Token.SUPER: {
        const node = this.startNode<ParseNode.SuperCall | ParseNode.SuperProperty>();
        this.next();
        if (this.test(Token.LPAREN)) {
          if (!this.scope.hasSuperCall()) {
            this.raiseEarly('InvalidSuperCall');
          }
          node.Arguments = this.parseArguments().Arguments;
          result = this.finishNode(node, 'SuperCall');
        } else {
          if (!this.scope.hasSuperProperty()) {
            this.raiseEarly('InvalidSuperProperty');
          }
          if (this.eat(Token.LBRACK)) {
            node.Expression = this.parseExpression();
            this.expect(Token.RBRACK);
            node.IdentifierName = null;
          } else {
            this.expect(Token.PERIOD);
            node.Expression = null;
            node.IdentifierName = this.parseIdentifierName();
          }
          result = this.finishNode(node, 'SuperProperty');
        }
        break;
      }
      case Token.IMPORT: {
        const node = this.startNode<ParseNode.ImportMeta | ParseNode.ImportCall>();
        this.next();
        if (this.scope.hasImportMeta() && this.eat(Token.PERIOD)) {
          this.expect('meta');
          result = this.finishNode(node, 'ImportMeta');
        } else {
          if (!allowCalls) {
            this.unexpected();
          }
          this.expect(Token.LPAREN);
          node.AssignmentExpression = this.parseAssignmentExpression();
          this.expect(Token.RPAREN);
          result = this.finishNode(node, 'ImportCall');
        }
        break;
      }
      default:
        result = this.parsePrimaryExpression();
        break;
    }

    const check = allowCalls ? isPropertyOrCall : isMember;
    while (check(this.peek().type)) {
      let finished: ParseNode.LeftHandSideExpression;
      switch (this.peek().type) {
        case Token.LBRACK: {
          const node = this.startNode<ParseNode.MemberExpression>(result);
          this.next();
          node.MemberExpression = result;
          node.IdentifierName = null;
          node.Expression = this.parseExpression();
          this.expect(Token.RBRACK);
          finished = this.finishNode(node, 'MemberExpression');
          break;
        }
        case Token.PERIOD: {
          const node = this.startNode<ParseNode.MemberExpression>(result);
          this.next();
          node.MemberExpression = result;
          if (this.test(Token.PRIVATE_IDENTIFIER)) {
            node.PrivateIdentifier = this.parsePrivateIdentifier();
            this.scope.checkUndefinedPrivate(node.PrivateIdentifier);
            node.IdentifierName = null;
          } else {
            node.IdentifierName = this.parseIdentifierName();
            node.PrivateIdentifier = null;
          }
          node.Expression = null;
          finished = this.finishNode(node, 'MemberExpression');
          break;
        }
        case Token.LPAREN: {
          const node = this.startNode<ParseNode.CallExpression>(result);
          // `async` [no LineTerminator here] `(`
          const couldBeArrow = this.matches('async', this.currentToken!)
            && result.type === 'IdentifierReference'
            && !this.peek().hadLineTerminatorBefore;
          if (couldBeArrow) {
            this.scope.pushArrowInfo(true);
          }
          const { Arguments, trailingComma } = this.parseArguments();
          node.CallExpression = result;
          node.Arguments = Arguments;
          if (couldBeArrow) {
            node.arrowInfo = this.scope.popArrowInfo();
            node.arrowInfo.hasTrailingComma = trailingComma;
          }
          finished = this.finishNode(node, 'CallExpression');
          break;
        }
        case Token.OPTIONAL: {
          const node = this.startNode<ParseNode.OptionalExpression>(result);
          node.MemberExpression = result;
          node.OptionalChain = this.parseOptionalChain();
          finished = this.finishNode(node, 'OptionalExpression');
          break;
        }
        case Token.TEMPLATE: {
          const node = this.startNode<ParseNode.TaggedTemplateExpression>(result);
          node.MemberExpression = result;
          node.TemplateLiteral = this.parseTemplateLiteral(true);
          finished = this.finishNode(node, 'TaggedTemplateExpression');
          break;
        }
        default:
          this.unexpected();
      }
      // NOTE: unwinds ParseNode.Finish type alias to avoid circularity issues in type checker
      result = finished as ParseNode.LeftHandSideExpression;
    }
    return result;
  }

  // OptionalChain
  parseOptionalChain(): ParseNode.OptionalChain {
    this.expect(Token.OPTIONAL);
    const base = this.startNode<ParseNode.OptionalChain>();
    base.OptionalChain = null;
    if (this.test(Token.LPAREN)) {
      base.Arguments = this.parseArguments().Arguments;
    } else if (this.eat(Token.LBRACK)) {
      base.Expression = this.parseExpression();
      this.expect(Token.RBRACK);
    } else if (this.test(Token.TEMPLATE)) {
      this.raise('TemplateInOptionalChain');
    } else if (this.test(Token.PRIVATE_IDENTIFIER)) {
      base.PrivateIdentifier = this.parsePrivateIdentifier();
      this.scope.checkUndefinedPrivate(base.PrivateIdentifier);
    } else {
      base.IdentifierName = this.parseIdentifierName();
    }

    let chain = this.finishNode(base, 'OptionalChain');
    while (true) {
      const node = this.startNode<ParseNode.OptionalChain>();
      if (this.test(Token.LPAREN)) {
        node.OptionalChain = chain;
        node.Arguments = this.parseArguments().Arguments;
        chain = this.finishNode(node, 'OptionalChain');
      } else if (this.eat(Token.LBRACK)) {
        node.OptionalChain = chain;
        node.Expression = this.parseExpression();
        this.expect(Token.RBRACK);
        chain = this.finishNode(node, 'OptionalChain');
      } else if (this.test(Token.TEMPLATE)) {
        this.raise('TemplateInOptionalChain');
      } else if (this.eat(Token.PERIOD)) {
        node.OptionalChain = chain;
        if (this.test(Token.PRIVATE_IDENTIFIER)) {
          node.PrivateIdentifier = this.parsePrivateIdentifier();
          this.scope.checkUndefinedPrivate(node.PrivateIdentifier);
        } else {
          node.IdentifierName = this.parseIdentifierName();
        }
        chain = this.finishNode(node, 'OptionalChain');
      } else {
        return chain;
      }
    }
  }

  // NewExpression
  parseNewExpression(): ParseNode.NewExpressionOrHigher {
    const node = this.startNode<ParseNode.NewTarget | ParseNode.NewExpression>();
    this.expect(Token.NEW);
    if (this.scope.hasNewTarget() && this.eat(Token.PERIOD)) {
      this.expect('target');
      return this.finishNode(node as ParseNode.NewTarget, 'NewTarget');
    }
    node.MemberExpression = this.parseLeftHandSideExpression(false);
    if (this.test(Token.LPAREN)) {
      node.Arguments = this.parseArguments().Arguments;
    } else {
      node.Arguments = null;
    }
    return this.finishNode(node as ParseNode.NewExpression, 'NewExpression');
  }

  // PrimaryExpression :
  //   ...
  parsePrimaryExpression(): ParseNode.PrimaryExpression {
    switch (this.peek().type) {
      case Token.IDENTIFIER:
      case Token.ESCAPED_KEYWORD:
      case Token.YIELD:
      case Token.AWAIT:
        // `async` [no LineTerminator here] `function`
        if (this.test('async') && this.testAhead(Token.FUNCTION)
            && !this.peekAhead().hadLineTerminatorBefore) {
          return this.parseFunctionExpression(FunctionKind.ASYNC);
        }
        return this.parseIdentifierReference();
      case Token.THIS: {
        const node = this.startNode<ParseNode.ThisExpression>();
        this.next();
        return this.finishNode(node, 'ThisExpression');
      }
      case Token.NUMBER:
      case Token.BIGINT:
        return this.parseNumericLiteral();
      case Token.STRING:
        return this.parseStringLiteral();
      case Token.NULL: {
        const node = this.startNode<ParseNode.NullLiteral>();
        this.next();
        return this.finishNode(node, 'NullLiteral');
      }
      case Token.TRUE:
      case Token.FALSE:
        return this.parseBooleanLiteral();
      case Token.LBRACK:
        return this.parseArrayLiteral();
      case Token.LBRACE:
        return this.parseObjectLiteral();
      case Token.FUNCTION:
        return this.parseFunctionExpression(FunctionKind.NORMAL);
      case Token.CLASS:
        return this.parseClassExpression();
      case Token.TEMPLATE:
        return this.parseTemplateLiteral();
      case Token.DIV:
      case Token.ASSIGN_DIV:
        return this.parseRegularExpressionLiteral();
      case Token.LPAREN:
        return this.parseCoverParenthesizedExpressionAndArrowParameterList();
      default:
        return this.unexpected();
    }
  }

  // NumericLiteral
  parseNumericLiteral(): ParseNode.NumericLiteral {
    const node = this.startNode<ParseNode.NumericLiteral>();
    if (!this.test(Token.NUMBER) && !this.test(Token.BIGINT)) {
      this.unexpected();
    }
    node.value = this.next().valueAsNumeric();
    return this.finishNode(node, 'NumericLiteral');
  }

  // StringLiteral
  parseStringLiteral(): ParseNode.StringLiteral {
    const node = this.startNode<ParseNode.StringLiteral>();
    if (!this.test(Token.STRING)) {
      this.unexpected();
    }
    node.value = this.next().valueAsString();
    return this.finishNode(node, 'StringLiteral');
  }

  // BooleanLiteral :
  //   `true`
  //   `false`
  parseBooleanLiteral(): ParseNode.BooleanLiteral {
    const node = this.startNode<ParseNode.BooleanLiteral>();
    switch (this.peek().type) {
      case Token.TRUE:
        this.next();
        node.value = true;
        break;
      case Token.FALSE:
        this.next();
        node.value = false;
        break;
      default:
        this.unexpected();
    }
    return this.finishNode(node, 'BooleanLiteral');
  }

  // ArrayLiteral :
  //   `[` `]`
  //   `[` Elision `]`
  //   `[` ElementList `]`
  //   `[` ElementList `,` `]`
  //   `[` ElementList `,` Elision `]`
  parseArrayLiteral(): ParseNode.ArrayLiteral {
    const node = this.startNode<ParseNode.ArrayLiteral>();
    this.expect(Token.LBRACK);
    node.ElementList = [];
    node.hasTrailingComma = false;
    while (true) {
      while (this.test(Token.COMMA)) {
        const elision = this.startNode<ParseNode.Elision>();
        this.next();
        node.ElementList.push(this.finishNode(elision, 'Elision'));
      }
      if (this.eat(Token.RBRACK)) {
        break;
      }
      if (this.test(Token.ELLIPSIS)) {
        const spread = this.startNode<ParseNode.SpreadElement>();
        this.next();
        spread.AssignmentExpression = this.parseAssignmentExpression();
        node.ElementList.push(this.finishNode(spread, 'SpreadElement'));
      } else {
        node.ElementList.push(this.parseAssignmentExpression());
      }
      if (this.eat(Token.RBRACK)) {
        node.hasTrailingComma = false;
        break;
      }
      node.hasTrailingComma = true;
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ArrayLiteral');
  }

  // ObjectLiteral :
  //   `{` `}`
  //   `{` PropertyDefinitionList `}`
  //   `{` PropertyDefinitionList `,` `}`
  parseObjectLiteral(): ParseNode.ObjectLiteral {
    const node = this.startNode<ParseNode.ObjectLiteral>();
    this.expect(Token.LBRACE);
    node.PropertyDefinitionList = [];
    let hasProto = false;
    while (true) {
      if (this.eat(Token.RBRACE)) {
        break;
      }
      const PropertyDefinition = this.parsePropertyDefinition();
      if (!this.state.json
          && PropertyDefinition.type === 'PropertyDefinition'
          && PropertyDefinition.PropertyName
          && !IsComputedPropertyKey(PropertyDefinition.PropertyName)
          && PropertyDefinition.PropertyName.type !== 'NumericLiteral'
          && StringValue(PropertyDefinition.PropertyName).stringValue() === '__proto__') {
        if (hasProto) {
          this.scope.registerObjectLiteralEarlyError(this.raiseEarly('DuplicateProto', PropertyDefinition.PropertyName));
        } else {
          hasProto = true;
        }
      }
      node.PropertyDefinitionList.push(PropertyDefinition);
      if (this.eat(Token.RBRACE)) {
        break;
      }
      this.expect(Token.COMMA);
    }
    return this.finishNode(node, 'ObjectLiteral');
  }

  parsePropertyDefinition(): ParseNode.PropertyDefinitionListElement {
    return this.parseBracketedDefinition('property');
  }

  parseFunctionExpression(kind: FunctionKind): ParseNode.FunctionExpressionLike {
    return this.parseFunction(true, kind) as ParseNode.FunctionExpressionLike;
  }

  parseArguments(): { Arguments: ParseNode.Arguments, trailingComma: boolean } {
    this.expect(Token.LPAREN);
    if (this.eat(Token.RPAREN)) {
      return { Arguments: [], trailingComma: false };
    }
    const Arguments: ParseNode.Arguments = [];
    let trailingComma = false;
    while (true) {
      const node = this.startNode<ParseNode.AssignmentRestElement>();
      if (this.eat(Token.ELLIPSIS)) {
        node.AssignmentExpression = this.parseAssignmentExpression();
        Arguments.push(this.finishNode(node, 'AssignmentRestElement'));
      } else {
        Arguments.push(this.parseAssignmentExpression());
      }
      if (this.eat(Token.RPAREN)) {
        break;
      }
      this.expect(Token.COMMA);
      if (this.eat(Token.RPAREN)) {
        trailingComma = true;
        break;
      }
    }
    return { Arguments, trailingComma };
  }

  /** https://tc39.es/ecma262/#sec-class-definitions */
  // ClassDeclaration :
  //   `class` BindingIdentifier ClassTail
  //   [+Default] `class` ClassTail
  //
  // ClassExpression :
  //   `class` BindingIdentifier? ClassTail
  parseClass(isExpression: boolean): ParseNode.ClassLike {
    const node = this.startNode<ParseNode.ClassLike>();

    this.expect(Token.CLASS);

    this.scope.with({ strict: true }, () => {
      if (!this.test(Token.LBRACE) && !this.test(Token.EXTENDS)) {
        node.BindingIdentifier = this.parseBindingIdentifier();
        if (!isExpression) {
          this.scope.declare(node.BindingIdentifier, 'lexical');
        }
      } else if (isExpression === false && !this.scope.isDefault()) {
        this.raise('ClassMissingBindingIdentifier');
      } else {
        node.BindingIdentifier = null;
      }
      node.ClassTail = this.scope.with({ default: false }, () => this.parseClassTail());
    });

    return this.finishNode(node, isExpression ? 'ClassExpression' : 'ClassDeclaration');
  }

  // ClassTail : ClassHeritage? `{` ClassBody? `}`
  // ClassHeritage : `extends` LeftHandSideExpression
  // ClassBody : ClassElementList
  parseClassTail(): ParseNode.ClassTail {
    const node = this.startNode<ParseNode.ClassTail>();

    if (this.eat(Token.EXTENDS)) {
      node.ClassHeritage = this.parseLeftHandSideExpression();
    } else {
      node.ClassHeritage = null;
    }

    this.expect(Token.LBRACE);
    if (this.eat(Token.RBRACE)) {
      node.ClassBody = null;
    } else {
      this.scope.with({
        superCall: !!node.ClassHeritage,
        private: true,
      }, () => {
        node.ClassBody = [];
        let hasConstructor = false;
        while (this.eat(Token.SEMICOLON)) {
          // nothing
        }
        const staticPrivates = new Set();
        const instancePrivates = new Set();
        while (!this.eat(Token.RBRACE)) {
          const m = this.parseClassElement();
          node.ClassBody.push(m);
          while (this.eat(Token.SEMICOLON)) {
            // nothing
          }
          if (m.type === 'ClassStaticBlock') {
            continue;
          }

          if (m.ClassElementName?.type === 'PrivateIdentifier') {
            let type: 'field' | 'method' | 'set' | 'get';
            if (m.type === 'FieldDefinition') {
              type = 'field';
            } else if (m.UniqueFormalParameters) {
              type = 'method';
            } else if (m.PropertySetParameterList) {
              type = 'set';
            } else {
              type = 'get';
            }
            if (type === 'get' || type === 'set') {
              if (m.static) {
                if (instancePrivates.has(m.ClassElementName.name)) {
                  this.raiseEarly('InvalidMethodName', m, m.ClassElementName.name);
                } else {
                  staticPrivates.add(m.ClassElementName.name);
                }
              } else {
                if (staticPrivates.has(m.ClassElementName.name)) {
                  this.raiseEarly('InvalidMethodName', m, m.ClassElementName.name);
                } else {
                  instancePrivates.add(m.ClassElementName.name);
                }
              }
            }
            this.scope.declare(m.ClassElementName, 'private', type);
            if (m.ClassElementName.name === 'constructor') {
              this.raiseEarly('InvalidMethodName', m, m.ClassElementName.name);
            }
          }

          const name = PropName(m);
          const isActualConstructor = !m.static
            && m.type === 'MethodDefinition'
            && !!m.UniqueFormalParameters
            && name === 'constructor';
          if (isActualConstructor) {
            if (hasConstructor) {
              this.raiseEarly('DuplicateConstructor', m);
            } else {
              hasConstructor = true;
            }
          }
          if ((m.static && name === 'prototype')
              || (!m.static && !isActualConstructor && name === 'constructor')) {
            this.raiseEarly('InvalidMethodName', m, name);
          }
          if (m.static && m.type === 'FieldDefinition' && name === 'constructor') {
            this.raiseEarly('InvalidMethodName', m, name);
          }
        }
      });
    }

    return this.finishNode(node, 'ClassTail');
  }

  parseClassElement(): ParseNode.ClassElement {
    let element;
    if (this.test('static') && this.testAhead(Token.LBRACE)) {
      const node = this.startNode<ParseNode.ClassStaticBlock>();
      this.expect('static');
      node.static = true;
      this.expect(Token.LBRACE);
      const ClassStaticBlockBody = this.startNode<ParseNode.ClassStaticBlockBody>();
      ClassStaticBlockBody.ClassStaticBlockStatementList = this.scope.with(
        {
          lexical: true,
          yield: false,
          await: true,
          return: false,
          superProperty: true,
          superCall: false,
          newTarget: true,
          label: 'boundary',
          classStaticBlock: true,
        },
        () => this.parseStatementList(Token.RBRACE),
      );
      node.ClassStaticBlockBody = this.finishNode(ClassStaticBlockBody, 'ClassStaticBlockBody');
      element = this.finishNode(node, 'ClassStaticBlock');
    } else {
      element = this.parseBracketedDefinition('class element');
    }
    return element;
  }

  parseClassExpression(): ParseNode.ClassExpression {
    return this.parseClass(true) as ParseNode.ClassExpression;
  }

  parseTemplateLiteral(tagged = false): ParseNode.TemplateLiteral {
    const node = this.startNode<ParseNode.TemplateLiteral>();
    node.TemplateSpanList = [];
    node.ExpressionList = [];
    let buffer = '';
    while (true) {
      if (this.position >= this.source.length) {
        this.raise('UnterminatedTemplate', this.position);
      }
      const c = this.source[this.position];
      switch (c) {
        case '`':
          this.position += 1;
          node.TemplateSpanList.push(buffer);
          this.next();
          if (!tagged) {
            node.TemplateSpanList.forEach((s) => {
              if (TV(s) === undefined) {
                this.raise('InvalidTemplateEscape');
              }
            });
          }
          return this.finishNode(node, 'TemplateLiteral');
        case '$':
          this.position += 1;
          if (this.source[this.position] === '{') {
            this.position += 1;
            node.TemplateSpanList.push(buffer);
            buffer = '';
            this.next();
            node.ExpressionList.push(this.parseExpression());
            break;
          }
          buffer += c;
          break;
        default: {
          if (c === '\\') {
            buffer += c;
            this.position += 1;
          }
          const l = this.source[this.position];
          this.position += 1;
          if (isLineTerminator(l)) {
            if (l === '\r' && this.source[this.position] === '\n') {
              this.position += 1;
            }
            if (l === '\u{2028}' || l === '\u{2029}') {
              buffer += l;
            } else {
              buffer += '\n';
            }
            this.line += 1;
            this.columnOffset = this.position;
          } else {
            buffer += l;
          }
          break;
        }
      }
    }
  }

  // RegularExpressionLiteral :
  //   `/` RegularExpressionBody `/` RegularExpressionFlags
  parseRegularExpressionLiteral(): ParseNode.RegularExpressionLiteral {
    const node = this.startNode<ParseNode.RegularExpressionLiteral>();
    this.scanRegularExpressionBody();
    node.RegularExpressionBody = this.scannedValue as string; // NOTE: unsound cast
    this.scanRegularExpressionFlags();
    node.RegularExpressionFlags = this.scannedValue as string; // NOTE: unsound cast
    try {
      const parse = (flags: { U: boolean; N: boolean; }) => {
        const p = new RegExpParser(node.RegularExpressionBody);
        return p.scope(flags, () => p.parsePattern());
      };
      if (node.RegularExpressionFlags.includes('u')) {
        parse({ U: true, N: true });
      } else {
        const pattern = parse({ U: false, N: false });
        if (pattern.groupSpecifiers.size > 0) {
          parse({ U: false, N: true });
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // @ts-expect-error
        this.raise('Raw', node.location.startIndex + e.position + 1, e.message);
      } else {
        throw e;
      }
    }
    const fakeToken = {
      endIndex: this.position - 1,
      line: this.line - 1,
      column: this.position - this.columnOffset,
    } as TokenData; // NOTE: unsound cast
    this.next();
    this.currentToken = fakeToken;
    return this.finishNode(node, 'RegularExpressionLiteral');
  }

  // CoverParenthesizedExpressionAndArrowParameterList :
  //   `(` Expression `)`
  //   `(` Expression `,` `)`
  //   `(` `)`
  //   `(` `...` BindingIdentifier `)`
  //   `(` `...` BindingPattern `)`
  //   `(` Expression `,` `...` BindingIdentifier `)`
  //   `(` Expression `.` `...` BindingPattern `)`
  parseCoverParenthesizedExpressionAndArrowParameterList(): ParseNode.CoverParenthesizedExpressionAndArrowParameterList | ParseNode.ParenthesizedExpression {
    const node = this.startNode<ParseNode.CoverParenthesizedExpressionAndArrowParameterList | ParseNode.ParenthesizedExpression>();
    const commaOp = this.startNode<ParseNode.CommaOperator>();
    this.expect(Token.LPAREN);
    if (this.test(Token.RPAREN)) {
      if (!this.testAhead(Token.ARROW) || this.peekAhead().hadLineTerminatorBefore) {
        this.unexpected();
      }
      this.next();
      node.Arguments = [];
      return this.finishNode(node, 'CoverParenthesizedExpressionAndArrowParameterList');
    }

    this.scope.pushArrowInfo();
    this.scope.pushAssignmentInfo('arrow');

    const expressions = [];
    let rparenAfterComma;
    while (true) {
      if (this.test(Token.ELLIPSIS)) {
        const inner = this.startNode<ParseNode.BindingRestElement>();
        this.next();
        switch (this.peek().type) {
          case Token.LBRACE:
          case Token.LBRACK:
            inner.BindingPattern = this.parseBindingPattern();
            break;
          default:
            inner.BindingIdentifier = this.parseBindingIdentifier();
            break;
        }
        expressions.push(this.finishNode(inner, 'BindingRestElement'));
        this.expect(Token.RPAREN);
        break;
      }
      expressions.push(this.parseAssignmentExpression());
      if (this.eat(Token.COMMA)) {
        if (this.eat(Token.RPAREN)) {
          rparenAfterComma = this.currentToken;
          break;
        }
      } else {
        this.expect(Token.RPAREN);
        break;
      }
    }

    const arrowInfo = this.scope.popArrowInfo();
    const assignmentInfo = this.scope.popAssignmentInfo();

    // ArrowParameters :
    //   CoverParenthesizedExpressionAndArrowParameterList
    if (this.test(Token.ARROW) && !this.peek().hadLineTerminatorBefore) {
      node.Arguments = expressions;
      node.arrowInfo = arrowInfo;
      assignmentInfo.clear();
      return this.finishNode(node, 'CoverParenthesizedExpressionAndArrowParameterList');
    } else {
      this.scope.arrowInfo?.merge(arrowInfo);
    }

    // ParenthesizedExpression :
    //   `(` Expression `)`
    if (expressions[expressions.length - 1].type === 'BindingRestElement') {
      this.unexpected(expressions[expressions.length - 1]);
    }
    if (rparenAfterComma) {
      this.unexpected(rparenAfterComma);
    }
    if (expressions.length === 1) {
      node.Expression = expressions[0] as ParseNode.Expression; // NOTE: unsound cast due to potential BindingRestElement
    } else {
      commaOp.ExpressionList = expressions as ParseNode.AssignmentExpressionOrHigher[]; // NOTE: unsound cast
      node.Expression = this.finishNode(commaOp, 'CommaOperator');
    }
    return this.finishNode(node, 'ParenthesizedExpression');
  }

  // PropertyName :
  //   LiteralPropertyName
  //   ComputedPropertyName
  // LiteralPropertyName :
  //   IdentifierName
  //   StringLiteral
  //   NumericLiteral
  // ComputedPropertyName :
  //   `[` AssignmentExpression `]`
  parsePropertyName(): ParseNode.PropertyNameLike {
    if (this.test(Token.LBRACK)) {
      const node = this.startNode<ParseNode.PropertyName>();
      this.next();
      node.ComputedPropertyName = this.parseAssignmentExpression();
      this.expect(Token.RBRACK);
      return this.finishNode(node, 'PropertyName');
    }
    if (this.test(Token.STRING)) {
      return this.parseStringLiteral();
    }
    if (this.test(Token.NUMBER) || this.test(Token.BIGINT)) {
      return this.parseNumericLiteral();
    }
    return this.parseIdentifierName();
  }

  // ClassElementName :
  //   PropertyName
  //   PrivateIdentifier
  parseClassElementName(): ParseNode.ClassElementName {
    if (this.test(Token.PRIVATE_IDENTIFIER)) {
      return this.parsePrivateIdentifier();
    }
    return this.parsePropertyName();
  }

  // PropertyDefinition :
  //   IdentifierReference
  //   CoverInitializedName
  //   PropertyName `:` AssignmentExpression
  //   MethodDefinition
  //   `...` AssignmentExpression
  // MethodDefinition :
  //   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
  //   GeneratorMethod
  //   AsyncMethod
  //   AsyncGeneratorMethod
  //   `get` ClassElementName `(` `)` `{` FunctionBody `}`
  //   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
  // GeneratorMethod :
  //   `*` ClassElementName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
  // AsyncMethod :
  //   `async` [no LineTerminator here] ClassElementName `(` UniqueFormalParameters `)` `{` AsyncFunctionBody `}`
  // AsyncGeneratorMethod :
  //   `async` [no LineTerminator here] `*` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`
  parseBracketedDefinition(type: 'class element'): ParseNode.ClassElement;
  parseBracketedDefinition(type: 'property'): ParseNode.PropertyDefinitionListElement;
  parseBracketedDefinition(type: 'property' | 'class element'): ParseNode.PropertyDefinitionListElement | ParseNode.ClassElement;
  parseBracketedDefinition(type: 'property' | 'class element'): ParseNode.PropertyDefinitionListElement | ParseNode.ClassElement {
    const node = this.startNode<ParseNode.PropertyDefinitionListElement | ParseNode.ClassElement>();

    if (type === 'property' && this.eat(Token.ELLIPSIS)) {
      node.PropertyName = null;
      node.AssignmentExpression = this.parseAssignmentExpression();
      return this.finishNode(node, 'PropertyDefinition');
    }

    let firstFirstName;
    if (type === 'class element') {
      if (this.test('static') && (
        this.testAhead(Token.ASSIGN)
        || this.testAhead(Token.SEMICOLON)
        || this.peekAhead().hadLineTerminatorBefore
        || isAutomaticSemicolon(this.peekAhead().type)
      )) {
        node.static = false;
        firstFirstName = this.parseIdentifierName();
      } else {
        node.static = this.eat('static');
        this.markNodeStart(node);
      }
    }

    let isGenerator = this.eat(Token.MUL);
    let isGetter = false;
    let isSetter = false;
    let isAsync = false;
    if (!isGenerator) {
      if (this.test('get')) {
        isGetter = true;
      } else if (this.test('set')) {
        isSetter = true;
      } else if (this.test('async') && !this.peekAhead().hadLineTerminatorBefore) {
        isAsync = true;
      }
    }

    const firstName = firstFirstName || (type === 'property'
      ? this.parsePropertyName()
      : this.parseClassElementName());

    if (!isGenerator && isAsync) {
      isGenerator = this.eat(Token.MUL);
    }

    const isSpecialMethod = isGenerator || ((isSetter || isGetter || isAsync) && !this.test(Token.LPAREN));

    if (!isGenerator) {
      if (type === 'property' && this.eat(Token.COLON)) {
        node.PropertyName = firstName as ParseNode.PropertyName; // NOTE: unsound cast
        node.AssignmentExpression = this.parseAssignmentExpression();
        return this.finishNode(node, 'PropertyDefinition');
      }

      if (type === 'class element' && (
        this.test(Token.ASSIGN)
        || this.test(Token.SEMICOLON)
        || this.peek().hadLineTerminatorBefore
        || isAutomaticSemicolon(this.peek().type)
      )) {
        node.ClassElementName = firstName;
        node.Initializer = this.scope.with({ superProperty: true }, () => this.parseInitializerOpt());
        const argumentNode = node.Initializer && ContainsArguments(node.Initializer);
        if (argumentNode) {
          this.raiseEarly('UnexpectedToken', argumentNode);
        }
        const finished = this.finishNode(node, 'FieldDefinition');
        this.semicolon();
        return finished;
      }

      if (type === 'property' && this.scope.assignmentInfoStack.length > 0 && this.test(Token.ASSIGN)) {
        node.IdentifierReference = this.repurpose(firstName, 'IdentifierReference') as ParseNode.IdentifierReference;
        node.Initializer = this.parseInitializerOpt();
        const finished = this.finishNode(node, 'CoverInitializedName');
        this.scope.registerObjectLiteralEarlyError(this.raiseEarly('UnexpectedToken', finished));
        return finished;
      }

      if (type === 'property'
          && !isSpecialMethod
          && firstName.type === 'IdentifierName'
          && !this.test(Token.LPAREN)
          && !isKeywordRaw(firstName.name)) {
        const IdentifierReference = this.repurpose(firstName, 'IdentifierReference') as ParseNode.IdentifierReference;
        this.validateIdentifierReference(firstName.name, firstName);
        return IdentifierReference;
      }
    }

    if (isSpecialMethod && (!isGenerator || isAsync)) {
      if (type === 'property') {
        node.ClassElementName = this.parsePropertyName();
      } else {
        node.ClassElementName = this.parseClassElementName();
      }
    } else {
      node.ClassElementName = firstName;
    }

    this.scope.with({
      lexical: true,
      variable: true,
      superProperty: true,
      await: isAsync,
      yield: isGenerator,
      classStaticBlock: false,
    }, () => {
      if (isSpecialMethod && isGetter) {
        this.expect(Token.LPAREN);
        this.expect(Token.RPAREN);
        node.PropertySetParameterList = null;
        node.UniqueFormalParameters = null;
      } else if (isSpecialMethod && isSetter) {
        this.expect(Token.LPAREN);
        node.PropertySetParameterList = [this.parseFormalParameter()];
        this.expect(Token.RPAREN);
        node.UniqueFormalParameters = null;
      } else {
        node.PropertySetParameterList = null;
        node.UniqueFormalParameters = this.parseUniqueFormalParameters();
      }

      this.scope.with({
        superCall: !isSpecialMethod
                   && !node.static
                   && node.ClassElementName
                   && ((node.ClassElementName.type === 'IdentifierName' && node.ClassElementName.name === 'constructor')
                    || (node.ClassElementName.type === 'StringLiteral' && node.ClassElementName.value === 'constructor'))
                   && this.scope.hasSuperCall(),
      }, () => {
        const body = this.parseFunctionBody(isAsync, isGenerator, false);
        // NOTE: since the property name below is a union, it is unsound to write to `node` in this fashion
        // @ts-expect-error
        node[`${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : 'Function'}Body`] = body;
        if (node.UniqueFormalParameters || node.PropertySetParameterList) {
          this.validateFormalParameters(node.UniqueFormalParameters || node.PropertySetParameterList!, body, true);
        }
      });
    });

    const name = `${isAsync ? 'Async' : ''}${isGenerator ? 'Generator' : ''}Method${isAsync || isGenerator ? '' : 'Definition'}` as ParseNode.MethodLike['type'];
    return this.finishNode(node, name);
  }
}
