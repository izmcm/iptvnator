# IPTVnator TV — a vibecoded fork

> [!NOTE]
> This is a personal fork **based on [IPTVnator](https://github.com/4gray/iptvnator)**
> by [4gray](https://github.com/4gray), **vibecoded** with improvements and
> features that came out of my own head, mostly for the TV apps on Samsung, LG
> and Fire TV. Its builds are **not official IPTVnator releases**; for the
> official apps and project, go to [IPTVnator](https://github.com/4gray/iptvnator).

## What this fork adds

- **No home server needed.** Direct mode (on by default) talks to Xtream and
  M3U providers straight from the TV. The Fire TV app carries its own built-in
  server, so Stalker portals work there too.
- **Add sources from your phone.** The TV shows a QR code and a 6-digit code;
  fill in the source on your phone instead of typing with the remote
  (Samsung and Fire TV).
- **Xtream links just work.** An Xtream panel's M3U link
  (`get.php?username=…&password=…`) is saved as an Xtream source, with series,
  film details and the programme guide.
- **Subtitles from Stremio addons.** OpenSubtitles v3 by default, no API key
  needed. Pick from every offered language, and adjust delay, size, position,
  opacity and text, outline and background colours with a live preview over
  the video.
- **A streaming-style player.** Large play/pause in the centre with ±10 s,
  a thin progress bar that scrubs faster while you hold an arrow, and one
  quiet row with Series details, Subtitles and Next episode. The Up next card
  sits just above the progress bar.
- **Fast catalogs.** Channel, film and series lists are cached on the TV for
  12 hours; Settings → Connection → **Refresh sources** reloads them.
- **Remote navigation that feels natural.** Up and Down move row by row and
  stay in the content; at the end of a list the page scrolls; Left opens the
  menu.
- **Fire TV.** Two apps install side by side: **IPTVnator TV** (the TV app,
  the same as on Samsung and LG) and **IPTVnator Full** (the desktop-style web
  app). Live channels play despite the providers' http→https redirects.
- **Small things.** Settings → Library & history → **Clear viewing history**,
  sharp icons on every TV (512 px on Samsung), and an IPTVnator TV icon and
  Fire TV banner of its own.

## Install

The newest builds are always in the
[`tv-latest` release](https://github.com/izmcm/iptvnator/releases/tag/tv-latest).

| TV | How to install |
| --- | --- |
| **Samsung** (Tizen 5.5+, 2020 on) | Put the TV in Developer Mode, then use [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung). Easiest: add `https://github.com/izmcm/iptvnator` under **Settings → Installing → Your sources**, and IPTVnator TV installs and updates from there. Or download `IPTVnator-TV.wgt` and install it as a **Custom WGT**. See the [Samsung guide](apps/tv/tizen/README.md). |
| **LG** (webOS 5+) | Install `IPTVnator-TV.ipk` in developer mode; see the [TV app guide](apps/tv/README.md#installation). |
| **Fire TV / Android TV** | In the **Downloader** app, enter **9239128** for IPTVnator TV (recommended) or **3355437** for IPTVnator Full. With ADB: `adb install -r IPTVnator-TV.apk`. |

The builds are produced by the `Build TV packages` workflow on every push to
`master`. To build them yourself, see the [TV app](apps/tv/README.md),
[Samsung](apps/tv/tizen/README.md) and [Android shell](tv-shell/README.md)
guides.

## About IPTVnator (upstream)

<p align="center">
  <img src="./apps/web/src/assets/icons/favicon.256x256.png" width="96" height="96" alt="IPTVnator icon" />
</p>

**IPTVnator is a free, open-source IPTV player for macOS, Windows, Linux and
the browser.** Bring your M3U playlists, Xtream Codes account or Stalker portal
to watch live TV, browse movies and series, and pick up where you left off.
Everything below describes the upstream project; this fork keeps it in sync.

**[Download](https://4gray.github.io/iptvnator/download/)** ·
[Website](https://4gray.github.io/iptvnator/) ·
[Getting started](https://4gray.github.io/iptvnator/guides/) ·
[Gallery](docs/screenshots.md)

[![Release](https://img.shields.io/github/v/release/4gray/iptvnator)](https://github.com/4gray/iptvnator/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/4gray/iptvnator/ci.yml?branch=master&label=CI)](https://github.com/4gray/iptvnator/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/github/downloads/4gray/iptvnator/total)](https://github.com/4gray/iptvnator/releases)

![IPTVnator dashboard with continue watching and live favorites in light and dark themes](./apps/website/public/screenshots/dashboard-themes.webp)

> [!IMPORTANT]
> IPTVnator is a **player**: it does not provide or sell subscriptions, channels,
> playlists or other media. Screenshots show demonstration content. Download
> the official desktop apps only from the
> [official website](https://4gray.github.io/iptvnator/) or
> [GitHub Releases](https://github.com/4gray/iptvnator/releases).
> [Learn about unofficial websites](https://4gray.github.io/iptvnator/blog/beware-unofficial-iptvnator-websites/).

## Desktop download

This fork does not publish desktop builds. Get the official desktop release
from the [download page](https://4gray.github.io/iptvnator/download/) or
[GitHub Releases](https://github.com/4gray/iptvnator/releases).

| macOS | Windows | Linux |
| --- | --- | --- |
| [Apple Silicon / Intel](https://4gray.github.io/iptvnator/download/macos/) | [Installer / portable](https://4gray.github.io/iptvnator/download/windows/) | [AppImage, deb, rpm and more](https://4gray.github.io/iptvnator/download/linux/) |

For package-manager commands, experimental Linux Embedded MPV support and
nightly builds, see [Installation](docs/installation.md).

## Features

- **Your sources together:** local or remote M3U/M3U8 playlists, Xtream Codes,
  and Stalker / Ministra portals.
- **Live TV:** channel groups, search and favorites, with a multi-channel
  programme guide for M3U and Xtream. XMLTV imports and catch-up run on desktop.
- **Movies and series:** posters, seasons, watch history and resume positions;
  optional TMDB metadata with your own API key.
- **Playback options:** built-in web players, external MPV/VLC/IINA and
  experimental Embedded MPV on desktop.
- **Watch later:** desktop downloads for movies and episodes, plus
  continue-watching and favorites across sources.
- **Make it yours:** light and dark themes, 21 language options, keyboard
  shortcuts and a command palette (`Ctrl/Cmd+K`).
- **Use your screen:** desktop apps, a self-hosted PWA and a phone remote for
  the desktop player.

[Full feature list and platform limits](docs/features.md) ·
[Keyboard shortcuts](docs/keyboard-shortcuts.md) ·
[All screenshots](docs/screenshots.md)

## Self-hosted PWA

Run the browser app and its backend together with Docker:

```bash
docker compose -f docker/docker-compose.yml up --build -d
```

Open <http://localhost:4333>. No separate backend container is needed. You can
also [run a server from the desktop app](docker/README.md#run-the-server-from-the-desktop-app).
Connected clients can share sources. Favorites, Recently Viewed and supported
watch progress each have their own synchronization opt-in.

The PWA does not include M3U XMLTV, Embedded MPV, managed external-player
launching, the download manager or Electron remote-control features.
See [Docker setup and client connections](docker/README.md) for configuration,
reverse proxies, playback troubleshooting and platform limits.

## Smart TV

### LG webOS and Samsung Tizen

LG webOS and Samsung Tizen share a dedicated TV client for M3U, Xtream Codes
and Stalker / Ministra sources. In this fork it needs no server for Xtream and
M3U (direct mode); Stalker portals still go through an IPTVnator web backend.
Install the ready-made packages as described in [Install](#install), or build
them yourself:

- [LG webOS installation](apps/tv/README.md#installation)
- [Samsung Tizen installation and signing](apps/tv/tizen/README.md)

Add sources from your phone by scanning a QR code (no server needed on
Samsung), or connect the TV to your self-hosted IPTVnator source library.
Favorites, history and resume positions stay on the TV.

See the [TV README](apps/tv/README.md) for compatibility, phone setup, source
synchronization and screenshots.

### Fire TV / Android TV shell (experimental)

The Android shell carries an embedded backend and comes as two APKs that
install side by side: **IPTVnator TV**, with the same TV client as Samsung and
LG, and **IPTVnator Full**, with the browser app. It's designed primarily for
Fire TV Stick and Android TV devices with a D-pad remote. Install them from
[Install](#install); for builds and remote controls, see the
[Android shell guide](./tv-shell/README.md).

### Enigma2 receivers

Dreaminator is a standalone IPTV plugin and browser-based playlist manager for
Enigma2 receivers. Organize channels in a browser and watch with the receiver's
remote. Tested on the Dreambox DM520 and Vu+ Uno 4K SE.

[Dreaminator on GitHub](https://github.com/4gray/dreaminator) ·
[Dreaminator on the IPTVnator blog](https://4gray.github.io/iptvnator/blog/dreaminator-enigma2/)

## Help and development

- [User guides](https://4gray.github.io/iptvnator/guides/) — sources, EPG,
  playback, downloads and updates.
- [Troubleshooting](docs/troubleshooting.md) — macOS and Linux startup fixes.
- [Build and develop](docs/development/README.md) — Node/pnpm setup, local
  Electron/PWA runs and diagnostics.
- [Developer and agent documentation](docs/maintenance/agent-context-map.md) —
  subsystem contracts; [AGENTS.md](AGENTS.md) and the
  [agent workflow](docs/development/agent-workflow.md) cover contribution rules.
- [Report a bug](https://github.com/4gray/iptvnator/issues) or join
  [Telegram](https://t.me/iptvnator) / [Bluesky](https://bsky.app/profile/iptvnator.bsky.social).

## Support the project

Support development through [GitHub Sponsors](https://github.com/sponsors/4gray),
[Ko-fi](https://ko-fi.com/4gray), or a star on GitHub.

## Contributors

[![GitHub commit contributors](https://img.shields.io/github/contributors/4gray/iptvnator)](https://github.com/4gray/iptvnator/graphs/contributors)

<details>
<summary>Show contributors</summary>

[![Contributor avatars](https://contrib.rocks/image?repo=4gray/iptvnator)](https://github.com/4gray/iptvnator/graphs/contributors)

</details>

## License and trademark

The source code is [MIT licensed](LICENSE.md). The IPTVnator name and logo are
unregistered trademarks of the project owner and are not covered by that
license. Forks and redistributions, including app-store submissions, must use
a different name and their own icon. See [TRADEMARK.md](TRADEMARK.md).
