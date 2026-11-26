/** Viewer subtitle preferences; addon subtitles follow the Stremio protocol. */
export interface SubtitleSettings {
    /** Stremio addon URLs (manifest or base), separated by spaces. */
    addons: string;
    /** Preferred addon language codes in order, e.g. "pob,por,eng". */
    languages: string;
    color: string;
    outline: string;
    /** Behind the text; 'transparent' for none. */
    background: string;
    /** Text size in percent of the default (5% of the screen height). */
    scale: number;
    /** Distance from the bottom in percent of the screen height. */
    offset: number;
    /** Text opacity in percent. */
    opacity: number;
}

export const defaultSubtitleSettings = (): SubtitleSettings => ({
    addons: 'https://opensubtitles-v3.strem.io/manifest.json',
    languages: 'pob,por,eng',
    color: '#ffffff',
    outline: '#000000',
    background: 'transparent',
    scale: 100,
    offset: 6,
    opacity: 100,
});

/** Choices the player's subtitle panel steps through with Left/Right. */
export const subtitleChoices = {
    color: ['#ffffff', '#ffeb3b', '#7fe9ff', '#a5ff7a', '#ff9ecb'],
    outline: ['#000000', '#404040', '#ffffff', 'transparent'],
    background: [
        'transparent',
        'rgba(0,0,0,0.5)',
        'rgba(0,0,0,0.8)',
        '#000000',
    ],
};

const LANGUAGES: Record<string, string> = {
    pob: 'Portuguese (Brazil)',
    por: 'Portuguese',
    eng: 'English',
    spa: 'Spanish',
    spn: 'Spanish (Europe)',
    fre: 'French',
    fra: 'French',
    ger: 'German',
    deu: 'German',
    ita: 'Italian',
    dut: 'Dutch',
    nld: 'Dutch',
    pol: 'Polish',
    rus: 'Russian',
    ukr: 'Ukrainian',
    tur: 'Turkish',
    ara: 'Arabic',
    heb: 'Hebrew',
    per: 'Persian',
    fas: 'Persian',
    hin: 'Hindi',
    jpn: 'Japanese',
    kor: 'Korean',
    chi: 'Chinese',
    zho: 'Chinese',
    ze: 'Chinese (bilingual)',
    zht: 'Chinese (traditional)',
    swe: 'Swedish',
    nor: 'Norwegian',
    dan: 'Danish',
    fin: 'Finnish',
    gre: 'Greek',
    ell: 'Greek',
    cze: 'Czech',
    ces: 'Czech',
    slo: 'Slovak',
    slk: 'Slovak',
    hun: 'Hungarian',
    rum: 'Romanian',
    ron: 'Romanian',
    bul: 'Bulgarian',
    hrv: 'Croatian',
    scc: 'Serbian',
    srp: 'Serbian',
    slv: 'Slovenian',
    est: 'Estonian',
    lav: 'Latvian',
    lit: 'Lithuanian',
    vie: 'Vietnamese',
    tha: 'Thai',
    ind: 'Indonesian',
    may: 'Malay',
    msa: 'Malay',
    cat: 'Catalan',
    baq: 'Basque',
    eus: 'Basque',
    glg: 'Galician',
    ice: 'Icelandic',
    isl: 'Icelandic',
    alb: 'Albanian',
    mac: 'Macedonian',
    bos: 'Bosnian',
    ben: 'Bengali',
    tam: 'Tamil',
    tel: 'Telugu',
    urd: 'Urdu',
    tgl: 'Tagalog',
};

/** Readable name for an OpenSubtitles/ISO 639-2 code; unknown codes stay as is. */
export function languageName(code: string) {
    return LANGUAGES[code.toLowerCase()] ?? code.toUpperCase();
}

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

/** Drops {\an8}-style and <i>-style tags until none are left ("<<i>i>" too). */
function stripTags(text: string) {
    let previous;
    do {
        previous = text;
        text = text.replace(/\{[^}]*\}|<[^>]*>/g, '');
    } while (text !== previous);
    return text;
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
        const text = stripTags(lines.slice(at + 1).join('\n')).trim();
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
