/**
 * Provider catalog lists (Xtream streams and categories) kept on the TV, so
 * opening Films or Series does not download thousands of entries again on
 * every visit or launch. Entries expire after MAX_AGE; Settings > Refresh
 * sources clears them. A missing or failing IndexedDB only means no cache.
 */
const DATABASE = 'iptvnator-tv-catalog';
const STORE = 'lists';
export const CATALOG_MAX_AGE = 12 * 60 * 60 * 1000;

let opening: Promise<IDBDatabase | undefined> | undefined;

function open(): Promise<IDBDatabase | undefined> {
    opening =
        opening ??
        new Promise((resolve) => {
            try {
                const request = indexedDB.open(DATABASE, 1);
                request.onupgradeneeded = () =>
                    request.result.createObjectStore(STORE);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(undefined);
            } catch {
                resolve(undefined);
            }
        });
    return opening;
}

function run<T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> {
    return open().then(
        (db) =>
            new Promise((resolve) => {
                if (!db) return resolve(undefined);
                try {
                    const request = work(
                        db.transaction(STORE, mode).objectStore(STORE)
                    );
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(undefined);
                } catch {
                    resolve(undefined);
                }
            })
    );
}

export async function readCatalog<T>(key: string, now = Date.now()) {
    const entry = (await run('readonly', (store) => store.get(key))) as
        { saved: number; data: T } | undefined;
    return entry && now - entry.saved < CATALOG_MAX_AGE
        ? entry.data
        : undefined;
}

export function writeCatalog(key: string, data: unknown) {
    return run('readwrite', (store) =>
        store.put({ saved: Date.now(), data }, key)
    );
}

/** Settings > Refresh sources: every source's lists are fetched again. */
export function clearCatalogCache() {
    return run('readwrite', (store) => store.clear());
}
