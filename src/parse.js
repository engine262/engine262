const acorn = require('acorn');

function ParseScript(
  sourceText, realm, hostDefined,
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

function ParseModule() {}

module.exports = {
  ParseScript,
  ParseModule,
};
