import { useEffect, useState } from 'preact/hooks';
import type { SubtitleSettings as Values } from '@iptvnator/tv/util';
import type { TvModel } from './use-tv';

/** Where subtitles come from. Their look is adjusted live in the player. */
export function SubtitleSettings({ tv }: { tv: TvModel }) {
    const persisted = tv.data.subtitles;
    const [values, setValues] = useState<Values>(persisted);
    const [saved, setSaved] = useState(false);
    useEffect(() => setValues(persisted), [JSON.stringify(persisted)]);
    const change = (next: Partial<Values>) => {
        setValues((current) => ({ ...current, ...next }));
        setSaved(false);
    };
    const save = (event: SubmitEvent) => {
        event.preventDefault();
        tv.update((data) => ({
            ...data,
            subtitles: {
                ...data.subtitles,
                addons: values.addons,
                languages: values.languages,
            },
        }))
            .then(() => setSaved(true))
            .catch(() => tv.setError('Settings could not be saved.'));
    };
    return (
        <form class="source-form" onSubmit={save}>
            <h2>Subtitles</h2>
            <p class="muted">
                Films and episodes get subtitles from Stremio addons. While
                watching, open Subtitles to pick a language and adjust size,
                position, colours and timing with a live preview.
            </p>
            <label>
                Stremio addon URLs (separate with spaces)
                <input
                    data-focus="settings:subtitles:addons"
                    value={values.addons}
                    onInput={(e) => change({ addons: e.currentTarget.value })}
                    autoComplete="off"
                />
            </label>
            <label>
                Preferred languages, in order (e.g. pob,por,eng)
                <input
                    data-focus="settings:subtitles:languages"
                    value={values.languages}
                    onInput={(e) =>
                        change({ languages: e.currentTarget.value })
                    }
                    autoComplete="off"
                />
            </label>
            <button class="primary" data-focus="settings:subtitles:save">
                Save settings
            </button>
            {saved ? <p role="status">Settings saved on this TV.</p> : null}
        </form>
    );
}
