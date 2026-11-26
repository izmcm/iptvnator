import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProviderTransport } from '@iptvnator/tv/data-access';
import type { Source } from '@iptvnator/tv/util';

const signal = () => new AbortController().signal;

test('without a backend, Xtream calls player_api.php on the provider directly', async (t) => {
    const calls: string[] = [];
    t.mock.method(globalThis, 'fetch', async (url: string) => {
        calls.push(url);
        return new Response(JSON.stringify([{ category_id: '1' }]));
    });
    const source: Source = {
        id: 'x',
        provider: 'xtream',
        name: 'Fixture',
        url: 'http://provider.invalid:8080/',
    };
    const payload = await new ProviderTransport('').request(
        source,
        'xtream',
        { action: 'get_live_categories', username: 'u', password: 'p' },
        signal()
    );
    assert.deepEqual(payload, [{ category_id: '1' }]);
    assert.equal(calls.length, 1);
    const url = new URL(calls[0]);
    assert.equal(
        url.origin + url.pathname,
        'http://provider.invalid:8080/player_api.php'
    );
    assert.equal(url.searchParams.get('action'), 'get_live_categories');
    assert.equal(url.searchParams.get('username'), 'u');
});

test('without a backend, M3U is downloaded and parsed on the TV', async (t) => {
    t.mock.method(
        globalThis,
        'fetch',
        async () =>
            new Response(
                '#EXTM3U\n#EXTINF:-1 tvg-logo="https://img.invalid/a.png" group-title="News",Channel A\nhttps://media.invalid/a.ts\n'
            )
    );
    const source: Source = {
        id: 'm',
        provider: 'm3u',
        name: 'Fixture',
        url: 'https://provider.invalid/list.m3u',
    };
    const result = (await new ProviderTransport('').request(
        source,
        'parse',
        {},
        signal()
    )) as {
        playlist: {
            items: { name: string; url: string; group: { title: string } }[];
        };
    };
    assert.equal(result.playlist.items.length, 1);
    assert.equal(result.playlist.items[0].name, 'Channel A');
    assert.equal(result.playlist.items[0].url, 'https://media.invalid/a.ts');
    assert.equal(result.playlist.items[0].group.title, 'News');
});

test('without a backend, provider HTTP errors and Stalker are rejected', async (t) => {
    t.mock.method(
        globalThis,
        'fetch',
        async () => new Response('', { status: 401 })
    );
    const xtream: Source = {
        id: 'x',
        provider: 'xtream',
        name: 'F',
        url: 'http://provider.invalid',
    };
    await assert.rejects(
        new ProviderTransport('').request(xtream, 'xtream', {}, signal())
    );
    await assert.rejects(
        new ProviderTransport('').request(
            { ...xtream, provider: 'stalker' },
            'stalker',
            {},
            signal()
        )
    );
});
