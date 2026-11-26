import { detectProviderImportCandidates } from '@iptvnator/shared/interfaces/provider-import';
import { httpUrl, type Source } from '@iptvnator/tv/util';

/**
 * An M3U link from an Xtream panel (get.php?username=…&password=…) as an
 * Xtream login: series, film details and EPG instead of a flat list.
 */
export function xtreamFromLink(url: string) {
    const found = detectProviderImportCandidates(url).find(
        (c) => c.kind === 'xtream' && c.confidence === 'high' && c.serverUrl
    );
    return found?.serverUrl
        ? {
              url: found.serverUrl,
              username: found.username ?? '',
              password: found.password ?? '',
          }
        : undefined;
}

export const newSourceId = () =>
    `tv-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** An Xtream or M3U source sent from the phone page. Throws on bad input. */
export function phoneSource(input: Record<string, unknown>): Source {
    const field = (key: string) =>
        typeof input[key] === 'string' ? (input[key] as string).trim() : '';
    const type = field('type');
    if (type !== 'xtream' && type !== 'm3u') throw new Error('Unknown type.');
    if (!field('name')) throw new Error('Enter a name.');
    const xtream = type === 'm3u' ? xtreamFromLink(field('url')) : undefined;
    const source: Source = {
        id: newSourceId(),
        name: field('name'),
        provider: xtream || type === 'xtream' ? 'xtream' : 'm3u',
        url: httpUrl(xtream?.url ?? field('url')),
    };
    if (xtream) return { ...source, ...xtream, url: source.url };
    if (type === 'xtream') {
        if (!field('username') || !field('password'))
            throw new Error('Enter the username and password.');
        return {
            ...source,
            username: field('username'),
            password: field('password'),
        };
    }
    return source;
}
