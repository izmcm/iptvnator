/**
 * HLS where the WebView cannot play it natively: the Android APK (tv-shell).
 * Samsung and LG play HLS themselves and never load hls.js. The APK ships
 * hls.light.min.js next to the app (tv-shell/scripts/bundle-tv-app.sh), loaded
 * on first use so the TV bundle itself does not grow.
 */
interface HlsInstance {
    loadSource(url: string): void;
    attachMedia(video: HTMLVideoElement): void;
    destroy(): void;
    on(
        event: string,
        listener: (event: string, data: { fatal?: boolean }) => void
    ): void;
}
interface HlsConstructor {
    new (config?: Record<string, unknown>): HlsInstance;
    isSupported(): boolean;
    Events: { ERROR: string };
}
type HlsWindow = { Hls?: HlsConstructor; __tvShellBackend?: string };

const SCRIPT = 'vendor/hls.light.min.js';
let loading: Promise<HlsConstructor | undefined> | undefined;

export function isHlsUrl(url: string): boolean {
    try {
        return /\.m3u8$/i.test(new URL(url).pathname);
    } catch {
        return false;
    }
}

/** Only inside the APK, and only where the WebView has no native HLS. */
export function needsHlsJs(video: HTMLVideoElement): boolean {
    return (
        !!(window as HlsWindow).__tvShellBackend &&
        !video.canPlayType('application/vnd.apple.mpegurl')
    );
}

function loadHls(): Promise<HlsConstructor | undefined> {
    const w = window as HlsWindow;
    if (w.Hls) return Promise.resolve(w.Hls);
    loading =
        loading ??
        new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = SCRIPT;
            script.onload = () => resolve(w.Hls);
            script.onerror = () => resolve(undefined);
            document.head.appendChild(script);
        });
    return loading;
}

/** Plays `url` through hls.js; resolves to a detach function, or undefined when unavailable. */
export async function attachHls(
    video: HTMLVideoElement,
    url: string,
    onFatal: () => void
): Promise<(() => void) | undefined> {
    const Hls = await loadHls();
    if (!Hls || !Hls.isSupported()) return undefined;
    const hls = new Hls({ enableWorker: true });
    hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) onFatal();
    });
    hls.loadSource(url);
    hls.attachMedia(video);
    return () => hls.destroy();
}
