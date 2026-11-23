package org.tvshell.iptvnator.server;

import android.content.res.AssetManager;
import android.util.Log;

import org.tvshell.iptvnator.ShellApp;
import org.tvshell.iptvnator.backend.Json;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.Charset;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import fi.iki.elonen.NanoHTTPD;

/**
 * "Add from phone" for the TV app (IPTVnator TV APK). A small server on the
 * device's Wi-Fi address serves the TV app's phone page (www/phone-setup) and
 * hands each POST /api/v1/source to the page, which checks the pairing code and
 * saves the source (libs/tv/data-access/src/local-setup.ts). The page drives it
 * over the loopback server: /tvshell/phone/start, next (long poll), reply, stop.
 * On Samsung TVs the page runs the same flow on Tizen sockets instead.
 */
public final class PhoneSetup {
    public static final int PORT = 8977;
    private static final long POLL_MS = 10_000;
    private static final long REPLY_TIMEOUT_MS = 15_000;
    private static final int MAX_BODY = 64 * 1024;
    private static final Charset UTF8 = Charset.forName("UTF-8");
    private static PhoneSetup instance;

    private final AssetManager assets;
    private final LinkedBlockingQueue<Pending> queue = new LinkedBlockingQueue<>();
    private final Map<String, Pending> waiting = new ConcurrentHashMap<>();
    private final AtomicInteger ids = new AtomicInteger();
    private LanServer server;
    private String url;

    private static final class Pending {
        final String id;
        final String body;
        final CountDownLatch done = new CountDownLatch(1);
        volatile int status = 500;
        volatile String reply = "{\"error\":\"The TV did not answer. Try again.\"}";

        Pending(String id, String body) {
            this.id = id;
            this.body = body;
        }
    }

    private PhoneSetup(AssetManager assets) {
        this.assets = assets;
    }

    static synchronized PhoneSetup get(AssetManager assets) {
        if (instance == null) instance = new PhoneSetup(assets);
        return instance;
    }

    /** Loopback routes under /tvshell/phone/. */
    NanoHTTPD.Response handle(String path, String body) {
        switch (path) {
            case "/tvshell/phone/start":
                return json(start());
            case "/tvshell/phone/next":
                return json(next());
            case "/tvshell/phone/reply":
                reply(body);
                return json(Json.object());
            case "/tvshell/phone/stop":
                stop();
                return json(Json.object());
            default:
                return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.NOT_FOUND, "text/plain", "");
        }
    }

    private synchronized Map<String, Object> start() {
        Map<String, Object> out = Json.object();
        if (server != null) {
            out.put("url", url);
            return out;
        }
        String address = lanAddress();
        if (address == null) {
            out.put("error", "No Wi-Fi or Ethernet address");
            return out;
        }
        try {
            LanServer candidate = new LanServer(address);
            candidate.start(NanoHTTPD.SOCKET_READ_TIMEOUT, true);
            server = candidate;
            url = "http://" + address + ":" + PORT + "/";
            Log.i(ShellApp.TAG, "phone setup listening on " + address + ":" + PORT);
            out.put("url", url);
        } catch (IOException e) {
            out.put("error", "Port " + PORT + " is busy");
        }
        return out;
    }

    private Map<String, Object> next() {
        Map<String, Object> out = Json.object();
        try {
            Pending pending = queue.poll(POLL_MS, TimeUnit.MILLISECONDS);
            if (pending != null) {
                waiting.put(pending.id, pending);
                out.put("id", pending.id);
                out.put("body", pending.body);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return out;
    }

    private void reply(String body) {
        if (body == null) return;
        Object parsed;
        try {
            parsed = Json.parse(body);
        } catch (RuntimeException e) {
            return;
        }
        if (!(parsed instanceof Map)) return;
        Map<?, ?> map = (Map<?, ?>) parsed;
        Pending pending = waiting.remove(String.valueOf(map.get("id")));
        if (pending == null) return;
        Object status = map.get("status");
        pending.status = status instanceof Number ? ((Number) status).intValue() : 500;
        Object reply = map.get("body");
        if (reply instanceof String) pending.reply = (String) reply;
        pending.done.countDown();
    }

    private synchronized void stop() {
        if (server != null) server.stop();
        server = null;
        url = null;
        for (Pending pending : queue) pending.done.countDown();
        queue.clear();
        for (Pending pending : waiting.values()) pending.done.countDown();
        waiting.clear();
    }

    /** The first site-local IPv4 address of an interface that is up. */
    private static String lanAddress() {
        try {
            for (NetworkInterface nif : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!nif.isUp() || nif.isLoopback()) continue;
                for (InetAddress address : Collections.list(nif.getInetAddresses())) {
                    if (address instanceof Inet4Address && address.isSiteLocalAddress()) {
                        return address.getHostAddress();
                    }
                }
            }
        } catch (IOException e) {
            Log.w(ShellApp.TAG, "phone setup: no network interfaces: " + e);
        }
        return null;
    }

    private static NanoHTTPD.Response json(Map<String, Object> value) {
        NanoHTTPD.Response response = NanoHTTPD.newFixedLengthResponse(
            NanoHTTPD.Response.Status.OK, "application/json; charset=utf-8", Json.write(value));
        response.addHeader("Cache-Control", "no-store");
        return response;
    }

    /** Serves only the phone page and the one POST route; nothing else of the app. */
    private final class LanServer extends NanoHTTPD {
        LanServer(String address) {
            super(address, PORT);
        }

        @Override
        public Response serve(IHTTPSession session) {
            String path = session.getUri();
            if (Method.GET.equals(session.getMethod()) && "/".equals(path)) return page();
            if (Method.POST.equals(session.getMethod()) && "/api/v1/source".equals(path)) return source(session);
            return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found");
        }

        private Response page() {
            try (InputStream in = assets.open("www/phone-setup/index.html")) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
                Response response = newFixedLengthResponse(Response.Status.OK, "text/html; charset=utf-8",
                    new String(out.toByteArray(), UTF8));
                response.addHeader("Cache-Control", "no-store");
                return response;
            } catch (IOException e) {
                return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "text/plain", "Phone page missing");
            }
        }

        private Response source(IHTTPSession session) {
            String length = session.getHeaders().get("content-length");
            int declared;
            try {
                declared = length == null ? 0 : Integer.parseInt(length.trim());
            } catch (NumberFormatException e) {
                declared = -1;
            }
            if (declared <= 0 || declared > MAX_BODY) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json", "{\"error\":\"Invalid request.\"}");
            }
            byte[] data = new byte[declared];
            int off = 0;
            try {
                InputStream in = session.getInputStream();
                while (off < declared) {
                    int read = in.read(data, off, declared - off);
                    if (read == -1) break;
                    off += read;
                }
            } catch (IOException e) {
                return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json", "{\"error\":\"Invalid request.\"}");
            }
            Pending pending = new Pending(String.valueOf(ids.incrementAndGet()), new String(data, 0, off, UTF8));
            queue.offer(pending);
            try {
                pending.done.await(REPLY_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            queue.remove(pending);
            waiting.remove(pending.id);
            Response.Status status = pending.status == 200 ? Response.Status.OK
                : pending.status == 404 ? Response.Status.NOT_FOUND : Response.Status.BAD_REQUEST;
            return newFixedLengthResponse(status, "application/json; charset=utf-8", pending.reply);
        }
    }
}
