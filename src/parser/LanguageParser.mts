import type { Mutable } from '../helpers.mjs';
import { ModuleParser } from './ModuleParser.mjs';
import type { ParseNode } from './ParseNode.mjs';
import { Token } from './tokens.mjs';

export abstract class LanguageParser extends ModuleParser {
  // Script : ScriptBody?
  parseScript(): ParseNode.Script {
    this.skipHashbangComment();
    const node = this.startNode<ParseNode.Script>();
    if (this.eat(Token.EOS)) {
      node.ScriptBody = null;
    } else {
      node.ScriptBody = this.parseScriptBody();
      node.ScriptBody.StatementList.forEach((statement) => {
        switch (statement.type) {
          case 'UsingDeclaration':
            // https://tc39.es/proposal-explicit-resource-management/#sec-let-and-const-declarations-static-semantics-early-errors
            //
            // UsingDeclaration : `using` BindingList `;`
            //
            // - It is a Syntax Error if the goal symbol is Script and UsingDeclaration is not contained, either
            //   directly or indirectly, within a Block, CaseBlock, ForStatement, ForInOfStatement, FunctionBody,
            //   GeneratorBody, AsyncGeneratorBody, AsyncFunctionBody, ClassStaticBlockBody, or ClassBody.
            this.raiseEarly('DeclarationNotAllowedInScript', statement, 'using');
            break;
          case 'AwaitUsingDeclaration':
            // https://tc39.es/proposal-explicit-resource-management/#sec-let-and-const-declarations-static-semantics-early-errors
            //
            // AwaitUsingDeclaration : CoverAwaitExpressionAndAwaitUsingDeclarationHead BindingList `;`
            //
            // - It is a Syntax Error if the goal symbol is Script and AwaitUsingDeclaration is not contained, either
            //   directly or indirectly, within a Block, CaseBlock, ForStatement, ForInOfStatement, FunctionBody,
            //   GeneratorBody, AsyncGeneratorBody, AsyncFunctionBody, ClassStaticBlockBody, or ClassBody.
            this.raiseEarly('DeclarationNotAllowedInScript', statement, 'await using');
            break;
          default:
            break;
        }
      });
    }
    return this.finishNode(node, 'Script');
  }

  // ScriptBody : StatementList
  parseScriptBody(): ParseNode.ScriptBody {
    const node = this.startNode<ParseNode.ScriptBody>();
    this.scope.with({
      in: true,
      lexical: true,
      variable: true,
      variableFunctions: true,
    }, () => {
      const directives: string[] = [];
      node.StatementList = this.parseStatementList(Token.EOS, directives);
      node.strict = directives.includes('use strict');
    });
    return this.finishNode(node, 'ScriptBody');
  }

  // Module : ModuleBody?
  parseModule(): ParseNode.Module {
    this.skipHashbangComment();
    return this.scope.with({
      module: true,
      strict: true,
      in: true,
      importMeta: true,
      await: true,
      lexical: true,
      variable: true,
    }, () => {
      const node = this.startNode<ParseNode.Module>();
      if (this.eat(Token.EOS)) {
        node.ModuleBody = null;
      } else {
        node.ModuleBody = this.parseModuleBody();
      }
      this.scope.undefinedExports.forEach((importNode, name) => {
        this.raiseEarly('ModuleUndefinedExport', importNode, name);
      });
      node.hasTopLevelAwait = this.state.hasTopLevelAwait;
      return this.finishNode(node, 'Module');
    });
  }

  // ModuleBody :
  //   ModuleItemList
  parseModuleBody(): ParseNode.ModuleBody {
    const node = this.startNode<ParseNode.ModuleBody>();
    node.ModuleItemList = this.parseModuleItemList();
    return this.finishNode(node, 'ModuleBody');
  }

  // ModuleItemList :
  //   ModuleItem
  //   ModuleItemList ModuleItem
  //
  // ModuleItem :
  //   ImportDeclaration
  //   ExportDeclaration
  //   StatementListItem
  parseModuleItemList(): ParseNode.ModuleItemList {
    const moduleItemList: Mutable<ParseNode.ModuleItemList> = [];
    while (!this.eat(Token.EOS)) {
      switch (this.peek().type) {
        case Token.IMPORT:
          moduleItemList.push(this.parseImportDeclaration());
          break;
        case Token.EXPORT:
          moduleItemList.push(this.parseExportDeclaration());
          break;
        default:
          moduleItemList.push(this.parseStatementListItem());
          break;
      }
    }
    return moduleItemList;
  }
}
