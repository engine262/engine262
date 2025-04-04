import http from 'node:http';
import https from 'node:https';
import { WebSocketServer } from 'ws';
import packageJson from '../../package.json' with { type: 'json' };
// Note: typescript will not copy json files, so it will not appear in the lib directory
// eslint-disable-next-line import/no-useless-path-segments
import protocol from '../../lib-src/inspector/js_protocol.json' with { type: 'json' };
import { Inspector } from '../inspector/index.mts';

const ANSI = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
};

export class NodeWebsocketInspector extends Inspector {
  _server: http.Server | https.Server;

  _ws: WebSocketServer;

  isDebug = false;

  protected override send(data: object): void {
    const s = JSON.stringify(data);
    this._ws.clients.forEach((ws) => {
      ws.send(s);
    });
  }

  protected constructor(server: http.Server | https.Server, isDebug: boolean) {
    super();
    this._server = server;
    const ws = new WebSocketServer({ server });
    this._ws = ws;
    ws.on('connection', (ws) => {
      const send = (obj: unknown) => {
        const s = JSON.stringify(obj);
        ws.send(s);
      };

      const sendEvent = Object.create(new Proxy({}, {
        get: (_, key: string) => {
          const f = (params: Record<string, unknown>) => {
            send({ method: key, params });
          };
          Object.defineProperty(sendEvent, key, { value: key });
          return f;
        },
      }));

      ws.on('message', (data: string) => {
        const { id, method, params } = JSON.parse(data);
        if (isDebug) {
          process.stdout.write(`${ANSI.green}${method}${ANSI.reset}: ${JSON.stringify(params)}\n`);
        }
        this.onMessage(id, method, params);
      });
    });
  }

  static inspectorHTTPServer(req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage>) {
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
  }

  static new(port = 9229, host = '127.0.0.1', isDebug = !!process.env.DEBUG) {
    const server = http.createServer(NodeWebsocketInspector.inspectorHTTPServer);
    const inspector = new NodeWebsocketInspector(server, isDebug);
    return new Promise<NodeWebsocketInspector>((resolve) => {
      server.listen(port, host, () => {
        resolve(inspector);
      });
    });
  }

  stop() {
    this._server.close();
    this._ws.close();
  }
}
