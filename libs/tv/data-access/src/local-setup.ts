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

export function startLocalSetup(
    onState: (state: LocalSetupState) => void,
    handle: (request: LocalRequest) => Promise<LocalReply>
): () => void {
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
