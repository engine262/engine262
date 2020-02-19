import { IdentifierParser } from './IdentifierParser.mjs';
// import { Token } from './tokens.mjs';

export class RegExpParser extends IdentifierParser {
  // RegularExpressionLiteral :
  //   `/` RegularExpressionBody `/` RegularExpressionFlags
  parseRegularExpressionLiteral() {
    const node = this.startNode();
    this.scanRegularExpressionBody();
    node.RegularExpressionBody = this.scannedValue;
    this.scanRegularExpressionFlags();
    node.RegularExpressionFlags = this.scannedValue;
    const fakeToken = {
      endIndex: this.position - 1,
      line: this.line - 1,
      column: this.position - this.columnOffset,
    };
    this.next();
    this.currentToken = fakeToken;
    return this.finishNode(node, 'RegularExpressionLiteral');
  }
}
