import {
    parseSubtitles,
    type Media,
    type SubtitleCue,
    type UserData,
} from '@iptvnator/tv/util';
import { TvMetadata } from './tmdb';

export interface SubtitleOption {
    url: string;
    lang: string;
    /** The addon's name from its manifest, e.g. "OpenSubtitles v3". */
    addon: string;
}

const CINEMETA = 'https://v3-cinemeta.strem.io';

async function json<T>(url: string, signal: AbortSignal, init?: RequestInit) {
    const response = await fetch(url, { ...init, signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
}

/** Provider names carry country prefixes, tags and years TMDB/Cinemeta do not. */
export function cleanTitle(title: string) {
    return title
        .replace(/^\s*(\[[^\]]*\]|[A-Z]{2,3}\s*[|:-])\s*/, '')
        .replace(/\(\d{4}\)|\[[^\]]*\]|\bS\d+\s*E\d+\b.*$/gi, '')
        .trim();
}

async function imdbFromTmdb(
    item: Media,
    tmdb: UserData['tmdb'],
    signal: AbortSignal
) {
    if (!tmdb.enabled || !tmdb.apiKey.trim()) return undefined;
    const { item: enriched } = await new TvMetadata(tmdb).enrich(item, signal);
    const id = enriched.metadata?.tmdbId;
    if (!id) return undefined;
    const key = tmdb.apiKey.trim();
    const bearer = key.startsWith('eyJ');
    const url = `https://api.themoviedb.org/3/${item.kind === 'movie' ? 'movie' : 'tv'}/${id}/external_ids${bearer ? '' : `?api_key=${encodeURIComponent(key)}`}`;
    const ids = await json<{ imdb_id?: string }>(url, signal, {
        headers: bearer ? { authorization: `Bearer ${key}` } : {},
    });
    return ids.imdb_id || undefined;
}

async function imdbFromCinemeta(item: Media, signal: AbortSignal) {
    const type = item.kind === 'movie' ? 'movie' : 'series';
    const title = cleanTitle(item.seriesTitle || item.title);
    if (!title) return undefined;
    const year = (item.seriesYear || item.year || '').slice(0, 4);
    const { metas = [] } = await json<{
        metas?: { imdb_id?: string; id?: string; releaseInfo?: string }[];
    }>(
        `${CINEMETA}/catalog/${type}/top/search=${encodeURIComponent(title)}.json`,
        signal
    );
    const match =
        (year && metas.find((m) => m.releaseInfo?.startsWith(year))) ||
        metas[0];
    const id = match?.imdb_id || match?.id;
    return id?.startsWith('tt') ? id : undefined;
}

/** The Stremio video ID: `tt…` for films, `tt…:season:episode` for episodes. */
export async function stremioId(
    item: Media,
    tmdb: UserData['tmdb'],
    signal: AbortSignal
) {
    const imdb =
        (await imdbFromTmdb(item, tmdb, signal).catch(() => undefined)) ??
        (await imdbFromCinemeta(item, signal));
    if (!imdb) return undefined;
    return item.kind === 'episode'
        ? `${imdb}:${item.season ?? 1}:${item.episode ?? 1}`
        : imdb;
}

const addonNames = new Map<string, Promise<string>>();
function addonName(base: string, signal: AbortSignal) {
    let name = addonNames.get(base);
    if (!name) {
        name = json<{ name?: string }>(`${base}/manifest.json`, signal)
            .then((m) => m.name || new URL(base).hostname)
            .catch(() => new URL(base).hostname);
        addonNames.set(base, name);
    }
    return name;
}

/** Every addon's subtitles for the title; preferred languages come first. */
export async function listSubtitles(
    settings: UserData['subtitles'],
    item: Media,
    id: string,
    signal: AbortSignal
): Promise<SubtitleOption[]> {
    const type = item.kind === 'movie' ? 'movie' : 'series';
    const preferred = settings.languages
        .split(',')
        .map((l) => l.trim().toLowerCase())
        .filter(Boolean);
    const bases = settings.addons
        .split(/\s+/)
        .filter(Boolean)
        .map((a) => a.replace(/\/manifest\.json$/, '').replace(/\/+$/, ''));
    const results = await Promise.all(
        bases.map(async (base) => {
            const [list, addon] = await Promise.all([
                json<{ subtitles?: { url?: string; lang?: string }[] }>(
                    `${base}/subtitles/${type}/${id}.json`,
                    signal
                ).catch(() => ({ subtitles: [] })),
                addonName(base, signal),
            ]);
            return (list.subtitles ?? [])
                .filter((s) => s.url && s.lang)
                .map((s) => ({ url: s.url!, lang: s.lang!, addon }));
        })
    );
    const rank = (lang: string) => {
        const at = preferred.indexOf(lang.toLowerCase());
        return at < 0 ? preferred.length : at;
    };
    const all: SubtitleOption[] = [];
    results.forEach((list) => list.forEach((s) => all.push(s)));
    // Stable: preferred languages in order, then the rest as the addons sent them.
    return all
        .map((s, order) => ({ s, order }))
        .sort((a, b) => rank(a.s.lang) - rank(b.s.lang) || a.order - b.order)
        .map(({ s }) => s);
}

export async function loadSubtitle(
    url: string,
    signal: AbortSignal
): Promise<SubtitleCue[]> {
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseSubtitles(await response.text());
}
