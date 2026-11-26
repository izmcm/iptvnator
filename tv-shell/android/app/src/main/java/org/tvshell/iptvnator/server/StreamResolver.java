package org.tvshell.iptvnator.server;

import org.tvshell.iptvnator.backend.Json;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

import fi.iki.elonen.NanoHTTPD;

/**
 * GET /tvshell/resolve?url=… → {"url": final address}. The Fire TV WebView
 * plays HLS through Amazon's ExoPlayer, which refuses cross-protocol redirects
 * (http → https), and Xtream live addresses often redirect that way; every
 * live channel then failed with "302". The TV app asks for the final address
 * first (libs/tv/data-access/src/player.ts) and plays that.
 */
final class StreamResolver {
    private static final int MAX_HOPS = 5;
    private static final int TIMEOUT_MS = 10_000;

    private StreamResolver() {
    }

    static NanoHTTPD.Response handle(String url) {
        Map<String, Object> out = Json.object();
        out.put("url", resolve(url));
        NanoHTTPD.Response response = NanoHTTPD.newFixedLengthResponse(
            NanoHTTPD.Response.Status.OK, "application/json; charset=utf-8", Json.write(out));
        response.addHeader("Cache-Control", "no-store");
        return response;
    }

    /** The address after redirects, or the original one when it cannot be followed. */
    static String resolve(String url) {
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) return url;
        String current = url;
        for (int hop = 0; hop < MAX_HOPS; hop++) {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(current).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(TIMEOUT_MS);
                connection.setReadTimeout(TIMEOUT_MS);
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) IPTVnator TV");
                int status = connection.getResponseCode();
                if (status < 300 || status >= 400) return current;
                String location = connection.getHeaderField("Location");
                if (location == null || location.isEmpty()) return current;
                String next = new URL(new URL(current), location).toString();
                if (!(next.startsWith("http://") || next.startsWith("https://"))) return current;
                current = next;
            } catch (IOException | RuntimeException e) {
                return current;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }
        return current;
    }
}
