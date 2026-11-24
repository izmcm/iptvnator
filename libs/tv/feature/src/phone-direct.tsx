import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
    localSetupAvailable,
    startLocalSetup,
    type LocalReply,
    type LocalRequest,
    type LocalSetupState,
} from '@iptvnator/tv/data-access';
import { phoneSource } from './source-input';
import type { TvModel } from './use-tv';

const MAX_ATTEMPTS = 5;
const newCode = () =>
    String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

/**
 * Add a source from a phone without a backend: the TV serves a small page on
 * the local network (Samsung only) and accepts one source with a 6-digit code.
 */
export function PhoneDirect({ tv }: { tv: TvModel }) {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<LocalSetupState>();
    const [code, setCode] = useState(newCode);
    const [qr, setQr] = useState('');
    const attempts = useRef(0);
    const latest = useRef({ code, tv });
    latest.current = { code, tv };
    useEffect(() => {
        if (!open) return;
        attempts.current = 0;
        const handle = async (request: LocalRequest): Promise<LocalReply> => {
            if (request.method !== 'POST' || request.path !== '/api/v1/source')
                return { status: 404, body: { error: 'Not found.' } };
            let input: Record<string, unknown>;
            try {
                input = JSON.parse(request.body);
            } catch {
                return { status: 400, body: { error: 'Invalid request.' } };
            }
            if (input.code !== latest.current.code) {
                attempts.current += 1;
                if (attempts.current >= MAX_ATTEMPTS) {
                    attempts.current = 0;
                    setCode(newCode());
                }
                return {
                    status: 400,
                    body: { error: 'Wrong code. Check the code on the TV.' },
                };
            }
            let source;
            try {
                source = phoneSource(input);
            } catch (error) {
                return {
                    status: 400,
                    body: {
                        error:
                            error instanceof Error
                                ? error.message
                                : 'Check the fields.',
                    },
                };
            }
            // Answer the phone first: saving navigates Home, which unmounts
            // this screen and stops the server before a reply could be sent.
            const saved = source;
            setTimeout(() => {
                setOpen(false);
                void latest.current.tv.saveSource(saved, '');
            }, 500);
            return { status: 200, body: { ok: true } };
        };
        return startLocalSetup(setState, handle);
    }, [open]);
    const url = state?.status === 'listening' ? state.url : '';
    // Bring the QR code and address into view once they exist.
    useEffect(() => {
        if (url)
            document
                .querySelector('.phone-direct')
                ?.scrollIntoView({ block: 'center' });
    }, [url, qr]);
    useEffect(() => {
        setQr('');
        if (url)
            void QRCode.toDataURL(`${url}?code=${code}`, {
                margin: 1,
                width: 240,
            })
                .then(setQr)
                .catch(() => setQr(''));
    }, [url, code]);
    // Samsung TVs (Tizen sockets) and the Android APK can serve the phone page.
    if (!localSetupAvailable()) return null;
    return (
        <section class="phone-setup" aria-label="Add from your phone">
            <h2>Add from your phone</h2>
            <p class="muted">
                No typing with the remote: fill in the source on your phone, on
                the same Wi-Fi as this TV.
            </p>
            {!open ? (
                <button
                    type="button"
                    class="primary"
                    data-focus="phone-direct-start"
                    onClick={() => setOpen(true)}
                >
                    Add from phone
                </button>
            ) : (
                <>
                    {state?.status === 'listening' ? (
                        <div class="phone-direct">
                            {qr ? (
                                <img
                                    src={qr}
                                    alt="QR code for the phone page"
                                />
                            ) : null}
                            <p>
                                Scan the code, or open <strong>{url}</strong> on
                                your phone.
                            </p>
                            <p>
                                Code: <strong>{code}</strong>
                            </p>
                        </div>
                    ) : state?.status === 'unavailable' ? (
                        <p role="alert">
                            Phone setup is unavailable on this TV ({state.error}
                            ).
                        </p>
                    ) : (
                        <p role="status">Starting…</p>
                    )}
                    <button
                        type="button"
                        data-focus="phone-direct-stop"
                        onClick={() => setOpen(false)}
                    >
                        Close
                    </button>
                </>
            )}
        </section>
    );
}
