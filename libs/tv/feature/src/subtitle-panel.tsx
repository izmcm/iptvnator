import { useEffect, useRef, useState } from 'preact/hooks';
import { restoreFocus } from '@iptvnator/tv/ui';
import {
    isBackKey,
    subtitleChoices,
    type SubtitleSettings,
} from '@iptvnator/tv/util';
import { SubtitleOverlay, type Subtitles } from './subtitles';
import type { TvModel } from './use-tv';

export type SubtitleField =
    | 'delay'
    | 'scale'
    | 'offset'
    | 'opacity'
    | 'color'
    | 'outline'
    | 'background';

const rows: [SubtitleField, string][] = [
    ['delay', 'Delay'],
    ['scale', 'Size'],
    ['offset', 'Vertical offset'],
    ['opacity', 'Opacity'],
    ['color', 'Text colour'],
    ['outline', 'Outline colour'],
    ['background', 'Background colour'],
];
const colour = (
    field: SubtitleField
): field is 'color' | 'outline' | 'background' =>
    field === 'color' || field === 'outline' || field === 'background';
const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

function valueText(field: SubtitleField, s: SubtitleSettings, delay: number) {
    if (field === 'delay')
        return `${delay > 0 ? '+' : ''}${delay.toFixed(2)} s`;
    if (colour(field)) return '';
    return `${s[field]} %`;
}

function Swatch({ value }: { value: string }) {
    return (
        <span
            class={`subtitle-swatch ${value === 'transparent' ? 'none' : ''}`}
            style={{ background: value }}
        />
    );
}

/**
 * Player panel: every offered language with its subtitles, and the style.
 * Adjusting a style hides the panel and shows sample text over the video;
 * Left/Right change the value live, OK or Back return to the panel.
 */
export function SubtitlePanel({
    tv,
    sub,
    close,
}: {
    tv: TvModel;
    sub: Subtitles;
    close: () => void;
}) {
    const s = tv.data.subtitles;
    const [tab, setTab] = useState<'tracks' | 'style'>('tracks');
    const [lang, setLang] = useState(
        sub.selected >= 0 ? sub.options[sub.selected].lang.toLowerCase() : ''
    );
    const [adjusting, setAdjusting] = useState<SubtitleField | null>(null);
    const pending = useRef<Partial<SubtitleSettings>>({});
    // Quick presses arrive before the saved value re-renders; step from the
    // newest value, not the last rendered one.
    const latest = useRef(s);
    latest.current = { ...s, ...pending.current };
    const save = (change: Partial<SubtitleSettings>) => {
        pending.current = { ...pending.current, ...change };
        latest.current = { ...latest.current, ...change };
        void tv
            .update((d) => ({ ...d, subtitles: { ...d.subtitles, ...change } }))
            .catch(() => tv.setError('Subtitle style could not be saved.'))
            .then(() => {
                pending.current = {};
            });
    };
    const step = (field: SubtitleField, direction: 1 | -1) => {
        const s = latest.current;
        if (field === 'delay') sub.setDelay(sub.delay + direction * 0.25);
        else if (field === 'scale')
            save({ scale: clamp(s.scale + direction * 10, 50, 250) });
        else if (field === 'offset')
            save({ offset: clamp(s.offset + direction, 0, 45) });
        else if (field === 'opacity')
            save({ opacity: clamp(s.opacity + direction * 10, 20, 100) });
        else {
            const list = subtitleChoices[field];
            const at = list.indexOf(s[field]);
            save({
                [field]: list[(at + direction + list.length) % list.length],
            });
        }
    };
    useEffect(() => {
        restoreFocus(
            tab === 'tracks' ? 'subtitles:tab-tracks' : 'subtitles:tab-style'
        );
    }, []);
    useEffect(() => {
        const key = (event: KeyboardEvent) => {
            const back = isBackKey(event);
            if (!adjusting && !back) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!adjusting) {
                close();
                restoreFocus('player-subtitles');
            } else if (event.keyCode === 37 || event.keyCode === 39)
                step(adjusting, event.keyCode === 39 ? 1 : -1);
            else if (back || event.keyCode === 13) {
                const field = adjusting;
                setAdjusting(null);
                restoreFocus(`subtitles:style:${field}`);
            }
        };
        window.addEventListener('keydown', key, true);
        return () => window.removeEventListener('keydown', key, true);
    });
    if (adjusting) {
        const label = rows.find(([f]) => f === adjusting)?.[1];
        return (
            <>
                <SubtitleOverlay tv={tv} sub={sub} preview />
                <div class="subtitle-adjust" role="status">
                    <span>{label}</span>
                    <strong>
                        ◀{' '}
                        {colour(adjusting) ? (
                            <Swatch value={s[adjusting]} />
                        ) : null}
                        {valueText(adjusting, s, sub.delay)} ▶
                    </strong>
                    <small>OK to finish</small>
                </div>
            </>
        );
    }
    const group = sub.languages.find((l) => l.lang === lang);
    return (
        <div
            class="subtitle-panel"
            data-tv-modal
            role="dialog"
            aria-label="Subtitles"
        >
            <div class="subtitle-tabs" data-tv-horizontal>
                <button
                    data-focus="subtitles:tab-tracks"
                    aria-pressed={tab === 'tracks'}
                    onClick={() => setTab('tracks')}
                >
                    Subtitles
                </button>
                <button
                    data-focus="subtitles:tab-style"
                    aria-pressed={tab === 'style'}
                    onClick={() => setTab('style')}
                >
                    Subtitle settings
                </button>
            </div>
            {tab === 'tracks' ? (
                <div class="subtitle-columns">
                    <div class="subtitle-column">
                        <h3>Language</h3>
                        <button
                            data-focus="subtitles:lang:off"
                            aria-pressed={sub.selected < 0}
                            onClick={() => {
                                sub.select(-1);
                                setLang('');
                            }}
                        >
                            None
                        </button>
                        {sub.languages.map((l) => (
                            <button
                                key={l.lang}
                                data-focus={`subtitles:lang:${l.lang}`}
                                aria-pressed={lang === l.lang}
                                onFocus={() => setLang(l.lang)}
                                onClick={() => setLang(l.lang)}
                            >
                                {l.name}
                                <span class="subtitle-count">
                                    {l.options.length}
                                </span>
                                {sub.selected >= 0 &&
                                sub.options[sub.selected].lang.toLowerCase() ===
                                    l.lang ? (
                                    <span class="subtitle-dot" />
                                ) : null}
                            </button>
                        ))}
                        {!sub.languages.length ? (
                            <p class="muted">{sub.status || 'No subtitles.'}</p>
                        ) : null}
                    </div>
                    <div class="subtitle-column">
                        <h3>{group ? group.name : ''}</h3>
                        {group?.options.map((index, n) => (
                            <button
                                key={index}
                                data-focus={`subtitles:track:${index}`}
                                aria-pressed={sub.selected === index}
                                onClick={() => sub.select(index)}
                            >
                                {sub.options[index].addon} · {n + 1}
                                {sub.selected === index ? (
                                    <span class="subtitle-dot" />
                                ) : null}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div class="subtitle-style">
                    {rows.map(([field, label]) => (
                        <button
                            key={field}
                            data-focus={`subtitles:style:${field}`}
                            onClick={() => setAdjusting(field)}
                        >
                            <span>{label}</span>
                            <span class="subtitle-value">
                                {colour(field) ? (
                                    <Swatch value={s[field]} />
                                ) : null}
                                {valueText(field, s, sub.delay)}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
