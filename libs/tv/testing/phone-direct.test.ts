import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIPv4 } from '@iptvnator/tv/data-access';
import { phoneSource } from '@iptvnator/tv/feature';

test('only private LAN addresses can serve the phone page', () => {
    for (const ip of ['192.168.18.148', '10.0.0.2', '172.16.5.1'])
        assert.equal(isPrivateIPv4(ip), true, ip);
    for (const ip of ['', '8.8.8.8', '172.32.0.1', '192.168.1.300', 'tv.local'])
        assert.equal(isPrivateIPv4(ip), false, ip);
});

test('phone input becomes an Xtream or M3U source', () => {
    const xtream = phoneSource({
        type: 'xtream',
        name: 'Home',
        url: 'http://provider.example:8080',
        username: 'u1',
        password: 'p1',
    });
    assert.equal(xtream.provider, 'xtream');
    assert.equal(xtream.username, 'u1');
    const fromLink = phoneSource({
        type: 'm3u',
        name: 'Panel',
        url: 'http://provider.example:8080/get.php?username=u2&password=p2&type=m3u_plus',
    });
    assert.equal(fromLink.provider, 'xtream');
    assert.equal(fromLink.url, 'http://provider.example:8080/');
    assert.equal(fromLink.password, 'p2');
    const m3u = phoneSource({
        type: 'm3u',
        name: 'List',
        url: 'https://lists.example/my.m3u',
    });
    assert.equal(m3u.provider, 'm3u');
    assert.equal(m3u.username, undefined);
});

test('incomplete phone input is rejected', () => {
    assert.throws(() =>
        phoneSource({ type: 'stalker', name: 'X', url: 'http://a.example' })
    );
    assert.throws(() =>
        phoneSource({ type: 'xtream', name: 'X', url: 'http://a.example' })
    );
    assert.throws(() =>
        phoneSource({ type: 'm3u', name: '', url: 'http://a.example' })
    );
    assert.throws(() =>
        phoneSource({ type: 'm3u', name: 'X', url: 'not a url' })
    );
});
