import http from 'node:http';
import { WebSocketServer } from 'ws';
import packageJson from '../package.json' with { type: 'json' };
import protocol from './js_protocol.json' with { type: 'json' };
import * as methods from './methods.mts';

export { attachRealm, getContext, inspectorOptions } from './context.mts';

const ANSI = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
};
const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();
    return;
  }

  const json = (obj: unknown) => {
    const s = JSON.stringify(obj);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(s),
    });
    res.end(s);
  };

  switch (req.url) {
    case '/json':
    case '/json/list':
      json([{
        description: `${packageJson.name} instance`,
        devtoolsFrontendUrl: 'chrome-devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=localhost:9229/',
        devtoolsFrontendUrlCompat: 'chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=localhost:9229/',
        faviconUrl: 'https://avatars0.githubusercontent.com/u/51185628',
        id: 'inspector.0',
        title: 'engine262',
        type: 'node',
        url: `file://${process.cwd()}`,
        webSocketDebuggerUrl: 'ws://localhost:9229/',
      }]);
      break;
    case '/json/version':
      json({
        'Browser': `${packageJson.name}/v${packageJson.version}`,
        'Protocol-Version': `${protocol.version.major}.${protocol.version.minor}`,
      });
      break;
    case '/json/protocol':
      json(protocol);
      break;
    default:
      res.writeHead(404);
      res.end();
      break;
  }
});

const wss = new WebSocketServer({ server });
const debug = process.env.DEBUG;
wss.on('connection', (ws) => {
  const send = (obj: unknown) => {
    const s = JSON.stringify(obj);
    ws.send(s);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ws as any)._socket.unref();

  const sendEvent = Object.create(new Proxy({}, {
    get: (_, key: string) => {
      const f = (params: Record<string, unknown>) => {
        send({ method: key, params });
      };
      Object.defineProperty(sendEvent, key, { value: key });
      return f;
    },
  }));
  const context = { sendEvent };

  ws.on('message', (data: string) => {
    const { id, method, params } = JSON.parse(data);
    if (debug) {
      process.stdout.write(`${ANSI.green}${method}${ANSI.reset}: ${JSON.stringify(params)}\n`);
    }
    if (method.startsWith('Network')) {
      return;
    }
    const [k, v] = method.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (methods as any)?.[k]?.[v];
    if (typeof f !== 'function') {
      process.stderr.write(`Unknown method requested: ${k}.${v}\n`);
      return;
    }
    Promise.resolve(f(params, context))
      .then((result = {}) => {
        send({ id, result });
      });
  });
});

await new Promise<void>((resolve) => {
  server.listen(9229, '127.0.0.1', () => {
    process.stdout.write('Debugger listening at localhost:9229\n');
    resolve();
  });
});
server.unref();
