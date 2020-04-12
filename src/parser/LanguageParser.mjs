import { StatementParser } from './StatementParser.mjs';
import { Token } from './tokens.mjs';

export class LanguageParser extends StatementParser {
  // Script : ScriptBody?
  parseScript() {
    const node = this.startNode();
    if (this.eat(Token.EOS)) {
      node.ScriptBody = null;
    } else {
      node.ScriptBody = this.parseScriptBody();
    }
    return this.finishNode(node, 'Script');
  }

  // ScriptBody : StatementList[~Yield, ~Await, ~Return]
  parseScriptBody() {
    const node = this.startNode();
    this.scope({
      yield: false,
      await: false,
      return: false,
    }, () => {
      node.StatementList = this.parseStatementList(Token.EOS);
    });
    return this.finishNode(node, 'ScriptBody');
  }
}
