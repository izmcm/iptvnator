import parser from 'iptv-playlist-parser';
import { normalizeXtreamServerUrl } from '@iptvnator/shared/interfaces';
import { ProviderRequestError } from './transport';

/**
 * Talks to the provider from the TV itself, without a backend. Packaged Tizen
 * and webOS apps are not bound by CORS, so Xtream and M3U work directly.
 * Stalker needs MAG headers (Cookie, User-Agent) that a browser cannot set.
 */
export async function directRequest(
    route: 'xtream' | 'stalker' | 'parse',
    params: Record<string, string | number>,
    signal: AbortSignal,
    endpoint: string
): Promise<unknown> {
    if (route === 'stalker') throw new ProviderRequestError(501, true); // ponytail: Stalker still needs a backend
    const url = new URL(
        route === 'xtream'
            ? `${normalizeXtreamServerUrl(endpoint)}/player_api.php`
            : endpoint
    );
    Object.keys(params).forEach((k) =>
        url.searchParams.set(k, String(params[k]))
    );
    const body = await fetchText(url.href, signal);
    if (route === 'parse') return { playlist: parser.parse(body) };
    try {
        return JSON.parse(body);
    } catch {
        throw new ProviderRequestError(502, true);
    }
}

async function fetchText(url: string, signal: AbortSignal) {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener('abort', cancel);
    if (signal.aborted) cancel();
    const timer = setTimeout(cancel, 35000);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            credentials: 'omit',
        });
        if (!response.ok) throw new ProviderRequestError(response.status, true);
        return await response.text();
    } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
    }
}
