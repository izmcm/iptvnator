# IPTVnator on a Samsung TV

IPTVnator is not in the Samsung TV store. You install it on your TV in
Developer Mode. The app targets Tizen 5.5 and newer (2020 models on). The
[device checklist](../../../docs/development/tv-tizen-validation.md) records
community test results and the remaining hardware checks.

There are two ways to install it:

- **[Ready-made build with Apps2Samsung](#install-with-apps2samsung)** (easiest):
  download `IPTVnator-TV.wgt` and let Apps2Samsung sign and install it.
- **[Build and sign it yourself](#build-and-sign-it-yourself)** with Tizen Studio.

No home server is needed: in **direct mode** (the default) the TV talks to
Xtream and M3U providers itself. Only Stalker portals need a
[backend](#backend-optional).

## 1. Turn on Developer Mode (TV)

1. Open **Apps**, then press `1 2 3 4 5` on the remote.
   - On remotes without number keys, press **123** (or the colour button) for
     the on-screen keypad, or use the remote in the SmartThings phone app.
   - On 2024 and newer TVs (Tizen 8), **Apps** is a tab on the home screen:
     scroll to the bottom of it, open **App Settings**, and type `12345` there.
2. Turn **Developer mode** On and enter the IP address of the computer (or
   phone) you install from in **Host PC IP**.
   - If the field cannot be edited, switch Developer mode Off and On again.
     On some models no keyboard opens: move to the field and type the digits
     straight away with the number keys or the on-screen keypad.
   - If the address shows up reversed, type it in reverse order.
3. **Unplug the TV for 30 seconds** and turn it on again. A restart from the
   remote is not enough for the new address to apply.

## Install with Apps2Samsung

1. Install [Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung/releases/latest)
   (Windows, macOS, Linux, or its Android app) and open it. It finds the TV, or
   add it with **⋯ → Add TV by IP…**.
2. Download `IPTVnator-TV.wgt` from the
   [`tv-latest` release](https://github.com/izmcm/iptvnator/releases/tag/tv-latest).
   The file is unsigned on purpose: a TV only accepts apps signed for itself.
3. Under **Advanced options**, turn on **Custom WGT** and choose the file.
4. Install. The first time, Apps2Samsung asks you to sign in with a Samsung
   account to create a certificate for your TV, then reuses it.

**IPTVnator TV** then appears under Apps. To update, install the newer file the
same way, from the same computer; your sources and settings stay on the TV.

## First run

- **Add a source** under Sources: Xtream (server, username, password) or an M3U
  link. An Xtream panel's M3U link (`get.php?username=…&password=…`) is saved as
  an Xtream source, so series, film details and the guide work.
- **Add from phone** avoids typing with the remote: the TV shows a QR code and a
  6-digit code; on a phone on the same Wi-Fi, fill in the source and send it.
- **Subtitles** for films and episodes come from Stremio addons (OpenSubtitles
  v3 by default). Settings → Subtitles holds the addon URLs and your preferred
  languages as codes, in order (`pob` Portuguese (Brazil), `por` Portuguese,
  `eng` English, `spa` Spanish…). While watching, **Subtitles** lists every
  offered language and adjusts delay, size, position, opacity and colours with
  a live preview.

## Build and sign it yourself

### Install the tools (computer)

Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)
with **Samsung TV Extension** and **Samsung Certificate Extension**. Put `tizen`
(`tizen.bat` on Windows) and `sdb` on your PATH.

### Create your certificate (computer, once)

In Tizen Studio's **Certificate Manager**, create a **Samsung** certificate profile
for a TV, sign in with your Samsung account, and add your TV's DUID (shown after
`sdb connect <tv-ip>:26101`). This profile is yours: keep it out of Git and back it up.
See Samsung's [certificate guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html).

### Build and sign (computer)

```sh
corepack pnpm install --frozen-lockfile
TIZEN_SIGNING_PROFILE='<your-profile>' corepack pnpm nx run tv:package-tizen
```

On PowerShell, set `$env:TIZEN_SIGNING_PROFILE = '<your-profile>'` first. The
signed app is in `dist/tv-tizen-package`. For an unsigned widget to install
with Apps2Samsung instead, run `corepack pnpm nx run tv:verify-build` and zip
the contents of `dist/tv-tizen-input` as a `.wgt`.

### Install (computer → TV)

```sh
sdb connect <tv-ip>:26101
tizen install -s <tv-ip>:26101 -n "<file>.wgt" -- dist/tv-tizen-package
```

## Backend (optional)

Direct mode covers Xtream and M3U. Stalker portals need MAC/session headers a
TV browser cannot send, so they go through an IPTVnator backend on your home
network (a computer or NAS that stays on): turn off **Direct mode** in
Settings → Connection and enter its address. See
[TV development](../../../docs/development/tv-development.md) and
[TV companion backend](../../../docker/tv/README.md).
