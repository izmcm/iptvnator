import { useRef } from 'preact/hooks';
import { TvIcon } from '@iptvnator/tv/ui';
import { episodeCode, mediaTitle, type Media } from '@iptvnator/tv/util';
import type { TvModel } from './use-tv';
import type { VodSequence } from './use-vod-sequence';
import type { useLiveOverlay } from './live-overlay';
import type { useSeriesDetails } from './use-series-details';
import type { Subtitles } from './subtitles';

/** h:mm:ss above an hour, m:ss below; LIVE for unknown durations. */
export function playerTime(seconds: number) {
    if (!Number.isFinite(seconds)) return 'LIVE';
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function heading(current: Media) {
    if (current.kind === 'episode')
        return `${episodeCode(current)} "${current.title}"`;
    return mediaTitle(current);
}

/**
 * Fullscreen player chrome: title on top; replay, play/pause and forward in
 * the middle (focus starts on play/pause); progress and a quiet row of
 * secondary actions at the bottom (Series details, Subtitles, Next episode;
 * channel tools when live), with Next episode last, away from Pause.
 */
export function PlayerChrome({
    tv,
    element,
    visible,
    hidden,
    overlay,
    seriesDetails,
    vod,
    sub,
    sourceName,
    back,
    toggle,
    openPlaylist,
    openSubtitles,
    previousChannel,
}: {
    tv: TvModel;
    element: HTMLVideoElement | null;
    visible: boolean;
    hidden: boolean;
    overlay: ReturnType<typeof useLiveOverlay>;
    seriesDetails: ReturnType<typeof useSeriesDetails>;
    vod: VodSequence;
    sub: Subtitles;
    sourceName: string;
    back: () => void;
    toggle: () => void;
    openPlaylist: () => void;
    openSubtitles: () => void;
    previousChannel: { play: () => void; pending: boolean };
}) {
    const current = tv.playing;
    const live = current?.kind === 'live';
    const ended = !!element?.ended && !live;
    const paused = !!element?.paused;
    const toggleLabel = ended ? 'Watch again' : paused ? 'Play ▶' : 'Pause';
    const duration = Number.isFinite(element?.duration)
        ? (element?.duration ?? 0)
        : 0;
    const position = element?.currentTime ?? 0;
    const saved = tv.data.favorites.some((item) => item.id === current?.id);
    const scrubStart = useRef(0);
    return (
        <div
            class={`player-controls ${visible || tv.error ? '' : 'dormant'}`}
            hidden={hidden}
        >
            <div class="player-top">
                <button
                    class="player-icon"
                    data-focus="player-back"
                    aria-label="Back"
                    onClick={back}
                >
                    <TvIcon name="back" />
                </button>
                <div class="player-title">
                    {current?.kind === 'episode' ? (
                        <>
                            <h1>{heading(current)}</h1>
                            <span>
                                <span class="player-media-title">
                                    {mediaTitle(current)}
                                </span>
                                {' · '}
                                <span class="player-source-name">
                                    {sourceName}
                                </span>
                            </span>
                        </>
                    ) : (
                        <>
                            <h1 class="player-media-title">
                                {current ? mediaTitle(current) : ''}
                            </h1>
                            <span class="player-source-name">{sourceName}</span>
                        </>
                    )}
                </div>
                <span class="player-icon-spacer" />
            </div>
            <div class="player-center" data-tv-horizontal>
                {!live ? (
                    <button
                        class="player-icon"
                        aria-label="Back 10 seconds"
                        onClick={() => tv.player.current?.seek(-10)}
                    >
                        <TvIcon name="replay" />
                        <small>10</small>
                    </button>
                ) : null}
                <button
                    class="player-icon player-toggle"
                    data-focus="player-toggle"
                    aria-label={toggleLabel}
                    onClick={toggle}
                >
                    <TvIcon
                        name={ended ? 'replay' : paused ? 'play' : 'pause'}
                    />
                </button>
                {!live ? (
                    <button
                        class="player-icon"
                        aria-label="Forward 10 seconds"
                        onClick={() => tv.player.current?.seek(10)}
                    >
                        <TvIcon name="forward" />
                        <small>10</small>
                    </button>
                ) : null}
            </div>
            <div class="player-bottom">
                {ended && current?.kind === 'episode' ? (
                    <p role="status">
                        Episode finished.{' '}
                        {vod.next
                            ? vod.activating
                                ? 'Playing the next episode…'
                                : 'Choose Next episode to continue.'
                            : vod.busy
                              ? 'Finding the next episode…'
                              : vod.failed
                                ? 'Next episode is unavailable.'
                                : 'No next episode was supplied.'}
                    </p>
                ) : null}
                {tv.player.current?.restoringPosition ? (
                    <p role="status">Restoring saved position…</p>
                ) : null}
                {tv.error ? (
                    <div role="alert" class="error player-error">
                        <p>{tv.error}</p>
                        <div class="player-error-actions" data-tv-horizontal>
                            {tv.errorRetry ? (
                                <button onClick={tv.errorRetry}>
                                    {tv.errorRetryLabel}
                                </button>
                            ) : null}
                            <button onClick={() => tv.setError('')}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                ) : null}
                {!live ? (
                    <div class="player-progress">
                        <input
                            aria-label="Playback position"
                            type="range"
                            step="any"
                            min="0"
                            max={duration}
                            value={position}
                            style={{
                                '--progress': `${duration ? (position / duration) * 100 : 0}%`,
                            }}
                            onInput={(e) =>
                                tv.player.current?.seekTo(
                                    Number(e.currentTarget.value)
                                )
                            }
                            onKeyDown={(e) => {
                                // Left/Right scrub like the ±10 buttons and
                                // speed up while held: 10 s, 30 s, then 60 s.
                                if (e.keyCode !== 37 && e.keyCode !== 39)
                                    return;
                                e.preventDefault();
                                e.stopPropagation();
                                if (!e.repeat) scrubStart.current = Date.now();
                                const held = Date.now() - scrubStart.current;
                                const step =
                                    held < 1000 ? 10 : held < 3000 ? 30 : 60;
                                tv.player.current?.seek(
                                    e.keyCode === 39 ? step : -step
                                );
                            }}
                        />
                        <span class="player-time">
                            {playerTime(position)} / {playerTime(duration)}
                        </span>
                    </div>
                ) : null}
                <div
                    class="player-actions"
                    data-tv-horizontal
                    onKeyDown={(e) => {
                        // Up from the action row reaches the Up next card
                        // first; the progress bar sits between them.
                        const card = document.querySelector<HTMLElement>(
                            '[data-focus="player-up-next"]'
                        );
                        if (e.keyCode !== 38 || !card?.offsetWidth) return;
                        e.preventDefault();
                        e.stopPropagation();
                        card.focus();
                    }}
                >
                    {live && tv.previousChannel ? (
                        <button
                            data-focus="player-previous"
                            disabled={previousChannel.pending}
                            onClick={previousChannel.play}
                        >
                            <TvIcon name="previous" />
                            Previous channel · {tv.previousChannel.title}
                        </button>
                    ) : null}
                    {live ? (
                        <>
                            <button
                                data-focus="player-channels"
                                onClick={overlay.openChannels}
                            >
                                <TvIcon name="live" />
                                Channels
                            </button>
                            <button
                                data-focus="player-grid"
                                onClick={overlay.openGrid}
                            >
                                <TvIcon name="series" />
                                TV Guide
                            </button>
                            <button
                                data-focus="player-guide"
                                onClick={overlay.openGuide}
                            >
                                <TvIcon name="history" />
                                Programme
                            </button>
                            <button
                                data-focus="player-playlist"
                                onClick={openPlaylist}
                            >
                                <TvIcon name="sources" />
                                Go to playlist
                            </button>
                        </>
                    ) : null}
                    {current?.kind === 'episode' ? (
                        <button
                            data-focus="player-series-details"
                            disabled={seriesDetails.busy}
                            onClick={() => void seriesDetails.open(current)}
                        >
                            <TvIcon name="episodes" />
                            {seriesDetails.busy
                                ? 'Finding series…'
                                : 'Series details'}
                        </button>
                    ) : null}
                    {sub.vod ? (
                        <button
                            data-focus="player-subtitles"
                            onClick={openSubtitles}
                        >
                            <TvIcon name="subtitles" />
                            Subtitles · {sub.label}
                        </button>
                    ) : null}
                    {live ? (
                        <button
                            class="tv-toggle"
                            aria-pressed={saved}
                            onClick={() => current && tv.favorite(current)}
                        >
                            <TvIcon name="favorites" />
                            {saved ? 'Saved' : 'Save'}
                        </button>
                    ) : null}
                    {current?.kind === 'episode' && vod.failed ? (
                        <button onClick={vod.retry}>Retry next episode</button>
                    ) : null}
                    {vod.next ? (
                        <button
                            class={ended ? 'primary' : ''}
                            data-focus="player-next"
                            disabled={vod.activating}
                            onClick={() => void vod.playNext()}
                        >
                            <TvIcon name="next" />
                            Next episode · {episodeCode(vod.next)}
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
