import { StatementParser } from './StatementParser.mjs';
import { Token } from './tokens.mjs';

export class LanguageParser extends StatementParser {
  // Script : ScriptBody?
  parseScript() {
    if (this.feature('hashbang')) {
      this.skipHashbangComment();
    }
    const node = this.startNode();
    if (this.eat(Token.EOS)) {
      node.ScriptBody = null;
    } else {
      node.ScriptBody = this.parseScriptBody();
    }
    return this.finishNode(node, 'Script');
  }

  // ScriptBody : StatementList
  parseScriptBody() {
    const node = this.startNode();
    this.scope({
      in: true,
    }, () => {
      const directives = [];
      node.StatementList = this.parseStatementList(Token.EOS, directives);
      node.strict = directives.includes('use strict');
    });
    return this.finishNode(node, 'ScriptBody');
  }

  // Module : ModuleBody?
  parseModule() {
    if (this.feature('hashbang')) {
      this.skipHashbangComment();
    }
    return this.scope({
      strict: true,
      in: true,
      importMeta: true,
      await: this.feature('TopLevelAwait'),
    }, () => {
      const node = this.startNode();
      if (this.eat(Token.EOS)) {
        node.ModuleBody = null;
      } else {
        node.ModuleBody = this.parseModuleBody();
      }
      return this.finishNode(node, 'Module');
    });
  }

  // ModuleBody :
  //   ModuleItemList
  parseModuleBody() {
    const node = this.startNode();
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
  parseModuleItemList() {
    const moduleItemList = [];
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
