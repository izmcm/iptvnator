// Tiny HTTP server for the phone page, on the TV's local address.
//
// Samsung TVs (Tizen 5.5+, 2020 models on) expose TCP sockets to Workers as
// tizentvwasm.SocketsManager; it only needs the internet privilege. The idea
// of serving a phone page from the TV comes from OpenIPTV. One connection is
// handled at a time; every socket is non-blocking and polled on a timer.
//
// Messages: in  {type:'start', address, port} | {type:'stop'} | {type:'response', id, status, contentType, body}
//           out {type:'listening', address, port} | {type:'error', reason} | {type:'request', id, method, path, body}
'use strict';

var TICK_MS = 50;
var IDLE_MS = 8000;
var MAX_REQUEST = 72 * 1024;
var STATUS = { 200: 'OK', 400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed', 413: 'Payload Too Large', 500: 'Internal Server Error' };

var sockets = null;
var listener = -1;
var client = null; // { id, bytes: Uint8Array, length, since, waiting }
var timer = null;
var nextId = 1;
var failed = false;

function fail(step, error) {
    if (failed) return;
    failed = true;
    var code = '';
    try { code = ' (errno ' + sockets.getErrorCode() + ')'; } catch (_e) {}
    stop(true);
    self.postMessage({ type: 'error', reason: step + ': ' + (error && error.message ? error.message : error) + code });
}

function closeClient() {
    if (client) {
        try { sockets.close(client.id); } catch (_e) {}
        client = null;
    }
}

function start(address, port) {
    if (typeof tizentvwasm === 'undefined' || !tizentvwasm.SocketsManager) {
        fail('start', 'no Tizen sockets on this TV');
        return;
    }
    sockets = tizentvwasm.SocketsManager;
    var step = 'create';
    try {
        listener = sockets.create('af_inet', 'sock_stream', tizentvwasm.SockFlags.SOCK_NONBLOCK);
        step = 'bind';
        var bytes = new Uint8Array(address.split('.').map(Number));
        sockets.bind(listener, new tizentvwasm.NetAddress('af_inet', bytes, port));
        step = 'listen';
        sockets.listen(listener, 4);
    } catch (error) {
        fail(step, error);
        return;
    }
    self.postMessage({ type: 'listening', address: address, port: port });
    schedule();
}

function stop(silent) {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    closeClient();
    if (listener >= 0) {
        try { sockets.close(listener); } catch (_e) {}
        listener = -1;
    }
    if (!silent) self.postMessage({ type: 'stopped' });
}

function schedule() {
    if (listener >= 0) timer = setTimeout(tick, TICK_MS);
}

function tick() {
    timer = null;
    if (!client) {
        try {
            var id = sockets.accept4(listener, tizentvwasm.SockFlags.SOCK_NONBLOCK);
            if (typeof id === 'number' && id >= 0)
                client = { id: id, bytes: new Uint8Array(MAX_REQUEST), length: 0, since: Date.now(), waiting: false };
        } catch (_e) {
            // EAGAIN: nobody is connecting right now.
        }
    }
    if (client && !client.waiting) read();
    if (client && !client.waiting && Date.now() - client.since > IDLE_MS) closeClient();
    schedule();
}

function read() {
    for (;;) {
        var room = client.bytes.length - client.length;
        if (room <= 0) {
            reply(413, 'text/plain; charset=utf-8', STATUS[413]);
            return;
        }
        var n;
        try {
            n = sockets.recv(client.id, client.bytes.subarray(client.length), 0);
        } catch (_e) {
            var errno = 0;
            try { errno = sockets.getErrorCode(client.id); } catch (_x) {}
            if (errno && errno !== 11) closeClient(); // 11 = EAGAIN: wait for more
            return;
        }
        if (!n) {
            closeClient(); // peer closed
            return;
        }
        client.length += n;
        if (parse()) return;
    }
}

// Returns true once a full request was dispatched.
function parse() {
    var text = new TextDecoder().decode(client.bytes.subarray(0, client.length));
    var split = text.indexOf('\r\n\r\n');
    if (split < 0) return false;
    var lines = text.slice(0, split).split('\r\n');
    var first = lines.shift().split(' ');
    var headers = {};
    lines.forEach(function (line) {
        var colon = line.indexOf(':');
        if (colon > 0) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
    });
    var length = Number(headers['content-length'] || 0);
    var headerBytes = new TextEncoder().encode(text.slice(0, split + 4)).length;
    if (client.length < headerBytes + length) return false;
    var body = new TextDecoder().decode(client.bytes.subarray(headerBytes, headerBytes + length));
    var method = first[0];
    var path = (first[1] || '/').split('?')[0];
    if (method === 'GET' && path === '/') serveFile('./index.html', 'text/html; charset=utf-8');
    else if (method === 'POST' && path.indexOf('/api/v1/') === 0) {
        var id = nextId++;
        client.waiting = id;
        self.postMessage({ type: 'request', id: id, method: method, path: path, body: body });
    } else reply(404, 'text/plain; charset=utf-8', STATUS[404]);
    return true;
}

function serveFile(path, type) {
    client.waiting = -1;
    fetch(path)
        .then(function (response) { return response.arrayBuffer(); })
        .then(function (data) { reply(200, type, new Uint8Array(data)); })
        .catch(function () { reply(500, 'text/plain; charset=utf-8', STATUS[500]); });
}

function reply(status, type, body) {
    if (!client) return;
    var bytes = body instanceof Uint8Array ? body : new TextEncoder().encode(String(body));
    var head = new TextEncoder().encode(
        'HTTP/1.1 ' + status + ' ' + (STATUS[status] || 'OK') + '\r\n' +
        'Content-Type: ' + type + '\r\n' +
        'Content-Length: ' + bytes.length + '\r\n' +
        'Cache-Control: no-store\r\nConnection: close\r\n\r\n'
    );
    var out = new Uint8Array(head.length + bytes.length);
    out.set(head);
    out.set(bytes, head.length);
    var sent = 0;
    var deadline = Date.now() + 3000;
    while (sent < out.length && Date.now() < deadline) {
        try {
            sent += sockets.send(client.id, out.subarray(sent), 0) || 0;
        } catch (_e) {
            var errno = 0;
            try { errno = sockets.getErrorCode(client.id); } catch (_x) {}
            if (errno !== 11) break;
            try { sockets.poll([new tizentvwasm.PollFd(client.id, tizentvwasm.PollFlags.POLLOUT)], 100); } catch (_p) {}
        }
    }
    closeClient();
}

self.onmessage = function (event) {
    var message = event.data || {};
    if (message.type === 'start') start(String(message.address), Number(message.port));
    if (message.type === 'stop') stop(false);
    if (message.type === 'response' && client && client.waiting === message.id)
        reply(message.status, message.contentType, message.body);
};
