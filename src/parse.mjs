import acorn from 'acorn';

function deepFreeze(obj) {
  Object.freeze(obj);
  for (const key of Reflect.ownKeys(obj)) {
    let childObj;
    try {
      childObj = obj[key];
    } catch (e) {
      continue;
    }
    if (Object(childObj) === childObj) {
      Object.freeze(childObj);
    }
  }
}

export function ParseScript(sourceText, realm, hostDefined) {
  let body;
  try {
    body = acorn.parse(sourceText, {
      sourceType: 'script',
      ecmaVersion: 2019,
    });
    deepFreeze(body);
  } catch (e) {
    body = [e];
  }

  if (Array.isArray(body)) {
    return body;
  }

  return {
    Realm: realm,
    Environment: undefined,
    ECMAScriptCode: body,
    HostDefined: hostDefined,
  };
}

export function ParseModule() {}
