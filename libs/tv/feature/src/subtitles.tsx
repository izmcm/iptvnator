import { useEffect, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import {
    listSubtitles,
    loadSubtitle,
    stremioId,
    type SubtitleOption,
} from '@iptvnator/tv/data-access';
import { cueAt, type SubtitleCue } from '@iptvnator/tv/util';
import type { TvModel } from './use-tv';

const DELAY_STEP = 0.5;

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
                setSelected(list.length ? 0 : -1);
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
    return {
        vod,
        text,
        delay,
        label: options[selected]?.label ?? (status || 'Off'),
        // Cycles Off → first option → … → last option → Off.
        cycle: () =>
            options.length &&
            setSelected((i) => (i + 1 >= options.length ? -1 : i + 1)),
        shift: (direction: 1 | -1) =>
            setDelay((d) => Math.round((d + direction * DELAY_STEP) * 10) / 10),
    };
}

export type Subtitles = ReturnType<typeof useSubtitles>;

export function SubtitleOverlay({ tv, sub }: { tv: TvModel; sub: Subtitles }) {
    if (!tv.fullscreen || !sub.text) return null;
    const s = tv.data.subtitles;
    const o = s.outline;
    return (
        <div
            class="subtitle-overlay"
            aria-live="off"
            style={{
                position: 'absolute',
                left: '5%',
                right: '5%',
                bottom: `${s.position}vh`,
                textAlign: 'center',
                pointerEvents: 'none',
                whiteSpace: 'pre-line',
                lineHeight: 1.25,
                fontWeight: 600,
                fontSize: `${s.size}vh`,
                color: s.color,
                textShadow: `-2px -2px 0 ${o}, 2px -2px 0 ${o}, -2px 2px 0 ${o}, 2px 2px 0 ${o}, 0 0 6px ${o}`,
            }}
        >
            {sub.text}
        </div>
    );
}

export function SubtitleControls({ sub }: { sub: Subtitles }) {
    if (!sub.vod) return null;
    const delay = `${sub.delay > 0 ? '+' : ''}${sub.delay.toFixed(1)}s`;
    return (
        <>
            <button data-focus="player-subtitles" onClick={sub.cycle}>
                Subtitles · {sub.label}
            </button>
            <button
                data-focus="player-subtitles-earlier"
                onClick={() => sub.shift(-1)}
            >
                Sub −0.5s
            </button>
            <button
                data-focus="player-subtitles-later"
                onClick={() => sub.shift(1)}
            >
                Sub +0.5s ({delay})
            </button>
        </>
    );
}
