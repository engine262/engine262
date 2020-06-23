import { Value } from '../value.mjs';
import { isHexDigit } from '../parse.mjs';

export function TV(s) {
  let buffer = '';
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '\\') {
      i += 1;
      switch (s[i]) {
        case 'b':
          buffer += '\b';
          break;
        case 'f':
          buffer += '\f';
          break;
        case 'n':
          buffer += '\n';
          break;
        case 'r':
          buffer += '\r';
          break;
        case 't':
          buffer += '\t';
          break;
        case 'v':
          buffer += '\v';
          break;
        case 'x':
          i += 1;
          if (isHexDigit(s[i]) && isHexDigit(s[i + 1])) {
            const n = Number.parseInt(s.slice(i, i + 2), 16);
            i += 2;
            buffer += String.fromCharCode(n);
          } else {
            return undefined;
          }
          break;
        case 'u':
          i += 1;
          if (s[i] === '{') {
            i += 1;
            const start = i;
            do {
              i += 1;
            } while (isHexDigit(s[i]));
            if (s[i] !== '}') {
              return undefined;
            }
            const n = Number.parseInt(s.slice(start, i), 16);
            buffer += String.fromCodePoint(n);
          } else if (isHexDigit(s[i]) && isHexDigit(s[i + 1])
                     && isHexDigit(s[i + 2]) && isHexDigit(s[i + 3])) {
            const n = Number.parseInt(s.slice(i, i + 4), 16);
            i += 3;
            buffer += String.fromCodePoint(n);
          } else {
            return undefined;
          }
          break;
        default:
          return undefined;
      }
    } else {
      buffer += s[i];
    }
  }
  return buffer;
}

export function TemplateStrings(node, raw) {
  if (raw) {
    return node.TemplateSpanList.map(Value);
  }
  return node.TemplateSpanList.map((v) => {
    const tv = TV(v);
    if (tv === undefined) {
      return Value.undefined;
    }
    return new Value(tv);
  });
}
