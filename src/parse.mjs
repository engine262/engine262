import acorn from 'acorn';
import walk from 'acorn/dist/walk';

export function ParseScript(sourceText, realm, hostDefined) {
  const body = acorn.parse(sourceText, {
    sourceType: 'script',
  });

  walk.fullAncestor(body, (node, ancestors) => {
    let strictMode = false;
    const parent = ancestors.reverse().find((n) => n.type === 'Program' || n.type === 'FunctionDeclaration');
    if (parent) {
      const directive = parent.body.find((n) => n.directive !== undefined);
      if (directive && directive.slice(1, -1) === 'use strict') {
        strictMode = true;
      }
    }
    node.IsStrict = strictMode;
  });

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule() {}
