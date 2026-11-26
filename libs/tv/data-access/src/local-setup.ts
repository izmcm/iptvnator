/**
 * A tiny HTTP server on the TV itself, so a phone on the same Wi-Fi can send
 * a source without a backend (idea from OpenIPTV). Samsung TVs expose TCP
 * sockets to Workers (tizentvwasm.SocketsManager); the server runs in
 * apps/tv/public/phone-setup/server.worker.js. Other platforms report
 * `unavailable`.
 */
export const LOCAL_SETUP_PORT = 8977;

export interface LocalRequest {
    method: string;
    path: string;
    body: string;
}
export interface LocalReply {
    status: 200 | 400 | 404;
    body: unknown;
}
export type LocalSetupState =
    | { status: 'starting' }
    | { status: 'listening'; url: string }
    | { status: 'unavailable'; error: string };

type TvNetwork = { webapis?: { network?: { getIp?: () => string } } };

export function isPrivateIPv4(value: string) {
    const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(value);
    if (!m || m.slice(1).some((part) => Number(part) > 255)) return false;
    const [a, b] = [Number(m[1]), Number(m[2])];
    return (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

export function tvAddress(): string {
    try {
        return (window as TvNetwork).webapis?.network?.getIp?.() ?? '';
    } catch {
        return '';
    }
}

/** Inside the Android APK (tv-shell), which serves the phone page natively. */
export function shellPhoneSetup(): boolean {
    return !!(window as { __tvShellBackend?: string }).__tvShellBackend;
}

/** Where "Add from phone" can run: Samsung TVs and the Android APK. */
export function localSetupAvailable(): boolean {
    return shellPhoneSetup() || isPrivateIPv4(tvAddress());
}

/**
 * Android APK: tv-shell's PhoneSetup serves the page on the Wi-Fi address and
 * queues each phone request; the page long-polls for it and posts the reply.
 */
function startShellSetup(
    onState: (state: LocalSetupState) => void,
    handle: (request: LocalRequest) => Promise<LocalReply>
): () => void {
    let stopped = false;
    const post = (path: string, body: unknown) =>
        fetch(`/tvshell/phone/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    const loop = async () => {
        while (!stopped) {
            let next: { id?: string; body?: string };
            try {
                next = await (await fetch('/tvshell/phone/next')).json();
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                continue;
            }
            if (stopped || !next.id) continue;
            const reply = await handle({
                method: 'POST',
                path: '/api/v1/source',
                body: next.body ?? '',
            }).catch((): LocalReply => ({
                status: 400,
                body: { error: 'The TV could not save this source.' },
            }));
            await post('reply', {
                id: next.id,
                status: reply.status,
                body: JSON.stringify(reply.body),
            }).catch(() => undefined);
        }
    };
    onState({ status: 'starting' });
    post('start', {})
        .then((response) => response.json())
        .then((result: { url?: string; error?: string }) => {
            if (stopped) return;
            if (!result.url) {
                onState({
                    status: 'unavailable',
                    error: result.error ?? 'Phone setup failed.',
                });
                return;
            }
            onState({ status: 'listening', url: result.url });
            void loop();
        })
        .catch(() => {
            if (!stopped)
                onState({
                    status: 'unavailable',
                    error: 'Phone setup failed.',
                });
        });
    return () => {
        stopped = true;
        void post('stop', {}).catch(() => undefined);
    };
}

export function startLocalSetup(
    onState: (state: LocalSetupState) => void,
    handle: (request: LocalRequest) => Promise<LocalReply>
): () => void {
    if (shellPhoneSetup()) return startShellSetup(onState, handle);
    const address = tvAddress();
    if (!isPrivateIPv4(address)) {
        onState({ status: 'unavailable', error: 'No local TV address.' });
        return () => undefined;
    }
    onState({ status: 'starting' });
    const worker = new Worker('phone-setup/server.worker.js');
    let stopped = false;
    worker.onmessage = (event: MessageEvent) => {
        const message = event.data ?? {};
        if (stopped) return;
        if (message.type === 'listening')
            onState({
                status: 'listening',
                url: `http://${message.address}:${message.port}/`,
            });
        if (message.type === 'error')
            onState({ status: 'unavailable', error: String(message.reason) });
        if (message.type === 'request')
            handle({
                method: message.method,
                path: String(message.path).split('?')[0],
                body: String(message.body ?? ''),
            })
                .catch((): LocalReply => ({
                    status: 400,
                    body: { error: 'The TV could not save this source.' },
                }))
                .then((reply) =>
                    worker.postMessage({
                        type: 'response',
                        id: message.id,
                        status: reply.status,
                        contentType: 'application/json; charset=utf-8',
                        body: JSON.stringify(reply.body),
                    })
                );
    };
    worker.onerror = () =>
        !stopped &&
        onState({ status: 'unavailable', error: 'Phone setup failed.' });
    worker.postMessage({ type: 'start', address, port: LOCAL_SETUP_PORT });
    return () => {
        stopped = true;
        worker.postMessage({ type: 'stop' });
        // Give the socket a moment to close before the worker goes away.
        setTimeout(() => worker.terminate(), 1500);
    };
}
