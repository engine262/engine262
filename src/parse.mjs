import acorn from 'acorn';
import walk from 'acorn/dist/walk';

export function ParseScript(sourceText, realm, hostDefined) {
  const body = acorn.parse(sourceText, {
    sourceType: 'script',
    ecmaVersion: 2019,
  });

  walk.fullAncestor(body, (node, ancestors) => {
    let strictMode = false;
    const parent = ancestors.reverse().find((n) => n.type === 'Program' || n.type === 'FunctionDeclaration');
    if (parent) {
      const directive = parent.type === 'FunctionDeclaration'
        ? parent.body.body.find((n) => n.directive !== undefined)
        : parent.body.find((n) => n.directive !== undefined);
      if (directive && directive.directive === 'use strict') {
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
