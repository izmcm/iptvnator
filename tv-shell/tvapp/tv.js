// Remote bridge for the IPTVnator TV app (apps/tv) inside the Android shell.
// Replaces the PWA's tv.js in the "IPTVnator TV" APK. The TV app already
// handles the D-pad and OK natively, so this only turns the shell's Back,
// Menu and media keys into the key codes the TV app knows (webOS codes), and
// points the app at the backend embedded in the APK (/api), which also makes
// Stalker portals work without a home server.
(function () {
    if (window.__tvShell) return; // loaded early by the bundle and again by the shell
    window.__tvShellBackend = location.origin + '/api';
    function press(code, name, type) {
        var event = new KeyboardEvent(type || 'keydown', {
            key: name,
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(event, 'keyCode', { value: code });
        Object.defineProperty(event, 'which', { value: code });
        (document.activeElement || document.body).dispatchEvent(event);
        return true;
    }
    var media = {
        playpause: [10252, 'MediaPlayPause'],
        play: [415, 'MediaPlay'],
        pause: [19, 'MediaPause'],
        stop: [413, 'MediaStop'],
        rewind: [412, 'MediaRewind'],
        fastforward: [417, 'MediaFastForward'],
    };
    var arrows = {
        Enter: 13,
        ArrowLeft: 37,
        ArrowUp: 38,
        ArrowRight: 39,
        ArrowDown: 40,
    };
    window.__tvShell = {
        back: function () {
            return press(461, 'GoBack');
        },
        menu: function () {
            return false;
        },
        media: function (action) {
            var key = media[action];
            return key ? press(key[0], key[1]) : false;
        },
        // Only used while a fullscreen view holds focus.
        key: function (type, name) {
            return arrows[name] ? press(arrows[name], name, type) : false;
        },
    };
})();
