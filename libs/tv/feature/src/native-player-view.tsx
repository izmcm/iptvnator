import { useLayoutEffect, useState } from 'preact/hooks';
import { restoreFocus } from '@iptvnator/tv/ui';
import type { RefObject } from 'preact';
import type { VodSequence } from './use-vod-sequence';
import type { TvModel } from './use-tv';
import type { useLiveOverlay } from './live-overlay';
import type { useSeriesDetails } from './use-series-details';
import { UpNextCard, useUpNext } from './up-next-card';
import type { usePlayerControls } from './player-controls';
import { SubtitleOverlay, useSubtitles } from './subtitles';
import { SubtitlePanel } from './subtitle-panel';
import { PlayerChrome } from './player-chrome';

export function NativePlayerView({
    tv,
    video,
    controls,
    overlay,
    seriesDetails,
    back,
    openPlaylist,
    vod,
    previousChannel,
}: {
    tv: TvModel;
    video: RefObject<HTMLVideoElement>;
    controls: ReturnType<typeof usePlayerControls>;
    overlay: ReturnType<typeof useLiveOverlay>;
    seriesDetails: ReturnType<typeof useSeriesDetails>;
    back: () => void;
    openPlaylist: () => void;
    vod: VodSequence;
    previousChannel: { play: () => void; pending: boolean };
}) {
    const current = tv.playing;
    const element = video.current;
    const sub = useSubtitles(tv, video);
    const [subtitlePanel, setSubtitlePanel] = useState(false);
    const upNext = useUpNext(
        tv,
        video,
        vod,
        !!overlay.panel,
        controls.reveal,
        seriesDetails.busy
    );
    useLayoutEffect(() => {
        if (!element?.ended || !vod.next || !tv.fullscreen) return;
        let owns = true;
        restoreFocus('player-next', '', undefined, () => owns);
        return () => {
            owns = false;
        };
    }, [element?.ended, vod.next?.id, tv.fullscreen]);
    const sourceName =
        tv.data.sources.find((source) => source.id === current?.sourceId)
            ?.name ?? 'Source unavailable';
    // Same action as the Play/Pause button: an ended title starts over.
    const togglePlayback = () =>
        element?.ended && current && current.kind !== 'live'
            ? tv.startOver(current)
            : tv.player.current?.toggle();
    // The visible controls layer sits over the video and receives bare picture clicks.
    const clickPicture = (event: MouseEvent) => {
        if (
            !tv.fullscreen ||
            overlay.panel ||
            !(event.target as Element | null)?.matches?.(
                'video, .player-controls'
            )
        )
            return;
        togglePlayback();
    };
    return (
        <div
            class={`native-player ${tv.fullscreen ? 'fullscreen' : 'preview'}`}
            hidden={!current}
            onClick={clickPicture}
        >
            <video ref={video} playsInline preload="metadata" />
            {subtitlePanel && tv.fullscreen ? (
                <SubtitlePanel
                    tv={tv}
                    sub={sub}
                    close={() => setSubtitlePanel(false)}
                />
            ) : (
                <SubtitleOverlay tv={tv} sub={sub} />
            )}
            {tv.fullscreen && upNext.card ? (
                <UpNextCard
                    card={upNext.card}
                    collapsed={upNext.collapsed}
                    play={upNext.play}
                />
            ) : null}
            {tv.fullscreen ? (
                <PlayerChrome
                    tv={tv}
                    element={element}
                    visible={controls.visible}
                    hidden={!!overlay.panel || subtitlePanel}
                    overlay={overlay}
                    seriesDetails={seriesDetails}
                    vod={vod}
                    sub={sub}
                    sourceName={sourceName}
                    back={back}
                    toggle={togglePlayback}
                    openPlaylist={openPlaylist}
                    openSubtitles={() => setSubtitlePanel(true)}
                    previousChannel={previousChannel}
                />
            ) : null}
        </div>
    );
}
