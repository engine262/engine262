import CST from 'cst';

export function ParseScript(
  sourceText /* : string */, realm /* : Realm */, hostDefined /* :?Object */,
) {
  const parser = new CST.Parser({
    sourceType: 'script',
    experimentalFeatures: {
      flow: false,
      jsx: false,
      decorators: false,
      doExpressions: false,
      functionBind: false,
      classProperties: false,
    },
  });

  const body = parser.parse(sourceText);

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule() {}
