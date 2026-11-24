import { useState } from 'preact/hooks';
import type { TvModel } from './use-tv';

/** Forgets what was watched on this TV; sources and favorites stay. */
export function ClearHistory({ tv }: { tv: TvModel }) {
    const [done, setDone] = useState(false);
    const empty =
        !tv.data.history.length && !Object.keys(tv.data.positions).length;
    return (
        <section class="source-form" aria-label="Viewing history">
            <h2>Viewing history</h2>
            <p class="muted">
                Removes History, Continue watching, saved positions and recent
                channels on this TV. Sources and favorites stay.
            </p>
            <button
                type="button"
                data-focus="settings:clear-history"
                disabled={empty}
                onClick={() => {
                    if (!confirm('Clear the viewing history on this TV?'))
                        return;
                    tv.update((data) => ({
                        ...data,
                        history: [],
                        positions: {},
                    }))
                        .then(() => setDone(true))
                        .catch(() =>
                            tv.setError('Viewing history could not be cleared.')
                        );
                }}
            >
                Clear viewing history
            </button>
            {done ? <p role="status">Viewing history cleared.</p> : null}
        </section>
    );
}
