import { useState } from 'preact/hooks';
import { clearCatalogCache } from '@iptvnator/tv/data-access';
import type { TvModel } from './use-tv';

/**
 * Channel, film and series lists are kept on the TV for a while so screens
 * open fast; this fetches them again now (new titles, renamed categories).
 */
export function RefreshSources({ tv }: { tv: TvModel }) {
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);
    return (
        <section class="source-form" aria-label="Refresh sources">
            <h2>Refresh sources</h2>
            <p class="muted">
                Lists are kept on this TV for up to 12 hours so screens open
                fast. Refresh to load new channels, films and series now.
            </p>
            <button
                type="button"
                data-focus="settings:refresh-sources"
                disabled={busy}
                onClick={() => {
                    setBusy(true);
                    setDone(false);
                    void clearCatalogCache().then(() => {
                        tv.retryConnection();
                        setBusy(false);
                        setDone(true);
                    });
                }}
            >
                {busy ? 'Refreshing…' : 'Refresh sources'}
            </button>
            {done ? (
                <p role="status">Lists will load again from your providers.</p>
            ) : null}
        </section>
    );
}
