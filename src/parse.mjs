import acorn from 'acorn';

export function ParseScript(
  sourceText /* : string */, realm /* : Realm */, hostDefined /* :?Object */,
) {
  const body = acorn.parse(sourceText, {
    sourceType: 'script',
  });

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule() {}
