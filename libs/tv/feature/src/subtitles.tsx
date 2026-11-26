import { useEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import {
    listSubtitles,
    loadSubtitle,
    stremioId,
    type SubtitleOption,
} from '@iptvnator/tv/data-access';
import {
    cueAt,
    languageName,
    type SubtitleCue,
    type SubtitleSettings,
} from '@iptvnator/tv/util';
import type { TvModel } from './use-tv';

export interface SubtitleLanguage {
    lang: string;
    name: string;
    /** Indexes into `options`. */
    options: number[];
}

/** Addon subtitles for the playing film or episode, drawn over the video. */
export function useSubtitles(tv: TvModel, video: RefObject<HTMLVideoElement>) {
    const current = tv.playing;
    const vod = current?.kind === 'movie' || current?.kind === 'episode';
    const [options, setOptions] = useState<SubtitleOption[]>([]);
    const [status, setStatus] = useState('');
    const [selected, setSelected] = useState(-1);
    const [cues, setCues] = useState<SubtitleCue[]>([]);
    const [delay, setDelay] = useState(0);
    const [text, setText] = useState('');
    useEffect(() => {
        setOptions([]);
        setSelected(-1);
        setDelay(0);
        if (!current || !vod || !tv.data.subtitles.addons.trim()) {
            setStatus('');
            return;
        }
        const abort = new AbortController();
        setStatus('Searching…');
        stremioId(current, tv.data.tmdb, abort.signal)
            .then((id) =>
                id
                    ? listSubtitles(
                          tv.data.subtitles,
                          current,
                          id,
                          abort.signal
                      )
                    : []
            )
            .then((list) => {
                if (abort.signal.aborted) return;
                setOptions(list);
                // Start with the first preferred language, if any was offered.
                const preferred = tv.data.subtitles.languages
                    .split(',')
                    .map((l) => l.trim().toLowerCase());
                setSelected(
                    list.length &&
                        preferred.includes(list[0].lang.toLowerCase())
                        ? 0
                        : -1
                );
                setStatus(list.length ? '' : 'None found');
            })
            .catch(() => {
                if (!abort.signal.aborted) setStatus('Unavailable');
            });
        return () => abort.abort();
    }, [current?.id, tv.data.subtitles.addons, tv.data.subtitles.languages]);
    const url = options[selected]?.url;
    useEffect(() => {
        setCues([]);
        if (!url) return;
        const abort = new AbortController();
        loadSubtitle(url, abort.signal)
            .then((list) => {
                if (!abort.signal.aborted) setCues(list);
            })
            .catch(() => {
                if (!abort.signal.aborted) setStatus('Could not load');
            });
        return () => abort.abort();
    }, [url]);
    useEffect(() => {
        const element = video.current;
        if (!element || !cues.length) {
            setText('');
            return;
        }
        const update = () => setText(cueAt(cues, element.currentTime, delay));
        update();
        element.addEventListener('timeupdate', update);
        element.addEventListener('seeked', update);
        return () => {
            element.removeEventListener('timeupdate', update);
            element.removeEventListener('seeked', update);
        };
    }, [cues, delay, video.current]);
    const languages: SubtitleLanguage[] = [];
    options.forEach((option, index) => {
        const lang = option.lang.toLowerCase();
        let group = languages.find((l) => l.lang === lang);
        if (!group) {
            group = { lang, name: languageName(lang), options: [] };
            languages.push(group);
        }
        group.options.push(index);
    });
    return {
        vod,
        text,
        delay,
        status,
        options,
        languages,
        selected,
        label: selected >= 0 ? languageName(options[selected].lang) : 'Off',
        select: setSelected,
        setDelay: (seconds: number) =>
            setDelay(Math.round(seconds * 100) / 100),
    };
}

export type Subtitles = ReturnType<typeof useSubtitles>;

export const SUBTITLE_SAMPLE = 'This is how your subtitles will look.';

export function subtitleStyle(s: SubtitleSettings) {
    const o = s.outline;
    return {
        fontSize: `${(5 * s.scale) / 100}vh`,
        color: s.color,
        opacity: s.opacity / 100,
        background: s.background,
        textShadow:
            o === 'transparent'
                ? 'none'
                : `-2px -2px 0 ${o}, 2px -2px 0 ${o}, -2px 2px 0 ${o}, 2px 2px 0 ${o}, 0 0 6px ${o}`,
    };
}

/** The current cue, or `preview` text while a style is being adjusted. */
export function SubtitleOverlay({
    tv,
    sub,
    preview,
}: {
    tv: TvModel;
    sub: Subtitles;
    preview?: boolean;
}) {
    const text = sub.text || (preview ? SUBTITLE_SAMPLE : '');
    if (!tv.fullscreen || !text) return null;
    const s = tv.data.subtitles;
    return (
        <div
            class="subtitle-overlay"
            aria-live="off"
            style={{
                position: 'absolute',
                left: '5%',
                right: '5%',
                bottom: `${s.offset}vh`,
                textAlign: 'center',
                pointerEvents: 'none',
                zIndex: 3,
            }}
        >
            <span
                style={{
                    ...subtitleStyle(s),
                    whiteSpace: 'pre-line',
                    lineHeight: 1.3,
                    fontWeight: 600,
                    padding: '0 0.3em',
                    WebkitBoxDecorationBreak: 'clone',
                    boxDecorationBreak: 'clone',
                }}
            >
                {text}
            </span>
        </div>
    );
}
