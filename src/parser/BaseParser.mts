import { Lexer } from './Lexer.mjs';

export abstract class BaseParser extends Lexer {}
export interface ParserState {
    json: boolean;
    hasTopLevelAwait: boolean
    strict: boolean
}
