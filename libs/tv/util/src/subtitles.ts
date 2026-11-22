/** Viewer subtitle preferences; addon subtitles follow the Stremio protocol. */
export interface SubtitleSettings {
    /** Stremio addon URLs (manifest or base), one per line. */
    addons: string;
    /** Preferred addon language codes in order, e.g. "pob,por,eng". */
    languages: string;
    color: string;
    outline: string;
    /** Font size as a percentage of the screen height. */
    size: number;
    /** Distance from the bottom as a percentage of the screen height. */
    position: number;
}

export const defaultSubtitleSettings = (): SubtitleSettings => ({
    addons: 'https://opensubtitles-v3.strem.io/manifest.json',
    languages: 'pob,por,eng',
    color: '#ffffff',
    outline: '#000000',
    size: 5,
    position: 8,
});

export interface SubtitleCue {
    start: number;
    end: number;
    text: string;
}

const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

function seconds(value: string): number {
    const m = TIME.exec(value);
    if (!m) return NaN;
    return (
        Number(m[1] ?? 0) * 3600 +
        Number(m[2]) * 60 +
        Number(m[3]) +
        Number(m[4].padEnd(3, '0')) / 1000
    );
}

/** Parses SRT and WebVTT. Styling tags are dropped; line breaks are kept. */
export function parseSubtitles(body: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const blocks = body
        .replace(/^\uFEFF/, '')
        .replace(/\r/g, '')
        .split(/\n{2,}/);
    for (const block of blocks) {
        const lines = block.split('\n');
        const at = lines.findIndex((line) => line.includes('-->'));
        if (at < 0) continue;
        const [from, to] = lines[at].split('-->');
        const start = seconds(from);
        const end = seconds(to);
        const text = lines
            .slice(at + 1)
            .join('\n')
            .replace(/\{[^}]*\}|<[^>]*>/g, '')
            .trim();
        if (text && start < end) cues.push({ start, end, text });
    }
    return cues.sort((a, b) => a.start - b.start);
}

/** The cue visible at `time`; `delay` shifts subtitles later when positive. */
export function cueAt(cues: SubtitleCue[], time: number, delay: number) {
    const t = time - delay;
    let low = 0;
    let high = cues.length - 1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (cues[mid].start <= t) low = mid + 1;
        else high = mid - 1;
    }
    // ponytail: overlapping cues show only the latest start
    const cue = cues[high];
    return cue && t < cue.end ? cue.text : '';
}
