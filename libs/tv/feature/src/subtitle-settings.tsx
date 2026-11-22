import { useEffect, useState } from 'preact/hooks';
import { TvSelect } from '@iptvnator/tv/ui';
import type { SubtitleSettings as Values } from '@iptvnator/tv/util';
import type { TvModel } from './use-tv';

const choices: {
    field: 'color' | 'outline' | 'size' | 'position';
    label: string;
    options: [string, string][];
}[] = [
    {
        field: 'color',
        label: 'Text colour',
        options: [
            ['#ffffff', 'White'],
            ['#ffeb3b', 'Yellow'],
            ['#7fe9ff', 'Cyan'],
            ['#a5ff7a', 'Green'],
        ],
    },
    {
        field: 'outline',
        label: 'Outline colour',
        options: [
            ['#000000', 'Black'],
            ['#404040', 'Dark grey'],
            ['transparent', 'None'],
        ],
    },
    {
        field: 'size',
        label: 'Text size',
        options: [
            ['4', 'Small'],
            ['5', 'Medium'],
            ['6.5', 'Large'],
            ['8', 'Extra large'],
        ],
    },
    {
        field: 'position',
        label: 'Vertical position',
        options: [
            ['3', 'Bottom edge'],
            ['8', 'Default'],
            ['14', 'Higher'],
            ['22', 'Highest'],
        ],
    },
];

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
        tv.update((data) => ({ ...data, subtitles: values }))
            .then(() => setSaved(true))
            .catch(() => tv.setError('Settings could not be saved.'));
    };
    return (
        <form class="source-form" onSubmit={save}>
            <h2>Subtitles</h2>
            <p class="muted">
                Films and episodes get subtitles from Stremio addons. In the
                player, Subtitles switches language and Sub ±0.5s fixes timing.
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
                Languages, in order (e.g. pob,por,eng)
                <input
                    data-focus="settings:subtitles:languages"
                    value={values.languages}
                    onInput={(e) =>
                        change({ languages: e.currentTarget.value })
                    }
                    autoComplete="off"
                />
            </label>
            {choices.map(({ field, label, options }) => (
                <label key={field}>
                    {label}
                    <TvSelect
                        label={label}
                        focusKey={`settings:subtitles:${field}`}
                        value={String(values[field])}
                        options={options.map(([value, text]) => ({
                            value,
                            label: text,
                        }))}
                        onChange={(next) =>
                            change(
                                field === 'size' || field === 'position'
                                    ? { [field]: Number(next) }
                                    : { [field]: next }
                            )
                        }
                    />
                </label>
            ))}
            <p
                class="subtitle-preview"
                style={{
                    background: '#222',
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: `${values.size}vh`,
                    color: values.color,
                    textShadow: `-2px -2px 0 ${values.outline}, 2px -2px 0 ${values.outline}, -2px 2px 0 ${values.outline}, 2px 2px 0 ${values.outline}`,
                }}
            >
                Subtitle preview
            </p>
            <button class="primary" data-focus="settings:subtitles:save">
                Save settings
            </button>
            {saved ? <p role="status">Settings saved on this TV.</p> : null}
        </form>
    );
}
