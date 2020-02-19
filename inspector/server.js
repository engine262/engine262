'use strict';

const http = require('http');
const WebSocket = require('ws'); // eslint-disable-line import/no-extraneous-dependencies
const packageJson = require('../package.json');
const protocol = require('./js_protocol.json');
const methods = require('./methods');

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end();
    return;
  }

  const json = (obj) => {
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

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const send = (obj) => {
    const s = JSON.stringify(obj);
    // console.log('<-', s);
    ws.send(s);
  };

  ws._socket.unref();

  const context = {
    sendEvent(event, params) {
      send({ method: event, params });
    },
  };

  ws.on('message', (data) => {
    // console.log('->', data);
    const { id, method, params } = JSON.parse(data);
    const [k, v] = method.split('.');
    Promise.resolve(methods[k][v](params, context))
      .then((result = {}) => {
        send({ id, result });
      });
  });
});

server.listen(9229, '127.0.0.1', () => {
  console.log('Debugger listening at localhost:9229'); // eslint-disable-line no-console
});
server.unref();
