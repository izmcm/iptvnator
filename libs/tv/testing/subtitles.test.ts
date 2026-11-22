import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cueAt, parseSubtitles } from '@iptvnator/tv/util';
import { cleanTitle } from '@iptvnator/tv/data-access';

const srt = `\uFEFF1\r
00:00:01,000 --> 00:00:02,500\r
<i>Hello</i>\r
{\\an8}there\r
\r
2\r
00:00:03,000 --> 00:00:04,000\r
Second\r
`;

test('SRT and VTT cues parse with tags removed and line breaks kept', () => {
    assert.deepEqual(parseSubtitles(srt), [
        { start: 1, end: 2.5, text: 'Hello\nthere' },
        { start: 3, end: 4, text: 'Second' },
    ]);
    const vtt = 'WEBVTT\n\n00:05.250 --> 00:06.000 line:90%\nShort\n';
    assert.deepEqual(parseSubtitles(vtt), [
        { start: 5.25, end: 6, text: 'Short' },
    ]);
});

test('the visible cue follows time and delay', () => {
    const cues = parseSubtitles(srt);
    assert.equal(cueAt(cues, 0.5, 0), '');
    assert.equal(cueAt(cues, 1.2, 0), 'Hello\nthere');
    assert.equal(cueAt(cues, 2.7, 0), '');
    assert.equal(cueAt(cues, 3.5, 0), 'Second');
    // Positive delay shows subtitles later.
    assert.equal(cueAt(cues, 1.2, 0.5), '');
    assert.equal(cueAt(cues, 1.6, 0.5), 'Hello\nthere');
    // Negative delay shows them earlier.
    assert.equal(cueAt(cues, 0.6, -0.5), 'Hello\nthere');
});

test('provider decorations are removed before title lookup', () => {
    assert.equal(cleanTitle('PT | Example Show (2008)'), 'Example Show');
    assert.equal(cleanTitle('[4K] Example Film'), 'Example Film');
    assert.equal(cleanTitle('Example Show S01E02'), 'Example Show');
});
