import assert from 'node:assert/strict';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const request = (path) => fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(10_000),
});

const health = await request('/api/health');
assert.equal(health.status, 200, 'La API debe tener conexión con PostgreSQL');
assert.deepEqual(await health.json(), { status: 'ok' });

const home = await request('/');
assert.equal(home.status, 200);
assert.match(home.headers.get('content-type') || '', /text\/html/);
const html = await home.text();
assert.match(html, /<div id="root">/);

const deepLink = await request('/login');
assert.equal(deepLink.status, 200, 'Las rutas de React necesitan el fallback SPA');
assert.equal(await deepLink.text(), html);

const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)];
assert.ok(assets.length > 0, 'La imagen debe incluir el build de React');
for (const [, path] of assets) {
    const asset = await request(path);
    assert.equal(asset.status, 200, `Recurso ausente: ${path}`);
    assert.doesNotMatch(asset.headers.get('content-type') || '', /text\/html/);
}

const protectedRoute = await request('/api/sesiones/active');
assert.equal(protectedRoute.status, 401, 'La API debe mantener la autenticación');

const missingRoute = await request('/api/no-existe');
assert.equal(missingRoute.status, 404, 'El fallback SPA no debe ocultar errores de la API');

const wsUrl = new URL('/ws/autorizaciones', baseUrl);
wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
await new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => finish(new Error('WebSocket no respondió')), 5_000);
    function finish(error) {
        clearTimeout(timer);
        socket.close();
        if (error) reject(error);
        else resolve();
    }
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'ping' })));
    socket.addEventListener('error', () => finish(new Error('Falló la conexión WebSocket')));
    socket.addEventListener('message', (event) => {
        try {
            assert.deepEqual(JSON.parse(event.data), { type: 'pong' });
            finish();
        } catch (error) {
            finish(error);
        }
    }, { once: true });
});

console.log('Docker OK: PostgreSQL, API, React, recursos estáticos, rutas SPA, JWT y WebSocket.');
