package in.sociobot.androidsiteblockerprivate;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.VpnService;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

/**
 * A deliberately narrow VPN: Android sends its normal UDP DNS traffic to two local addresses,
 * blocked names receive an on-device NXDOMAIN, and permitted requests go to the active network's
 * configured resolver. No packets, domain names, counters, or diagnostic events are persisted.
 */
public final class QuietwallVpnService extends VpnService {
    public static final String ACTION_START = "in.sociobot.androidsiteblockerprivate.START_DNS_VPN";
    public static final String ACTION_STOP = "in.sociobot.androidsiteblockerprivate.STOP_DNS_VPN";
    private static final int NOTIFICATION_ID = 741;
    private static final String CHANNEL_ID = "quietwall_vpn";
    private static final String IPV4_GATEWAY = "10.99.0.1";
    private static final String IPV4_DNS = "10.99.0.2";
    private static final String IPV6_GATEWAY = "fd51:7177:616c:6c00::1";
    private static final String IPV6_DNS = "fd51:7177:616c:6c00::2";

    // Debug instrumentation reads these process-local observations while a clean-device claim is
    // running. They are never persisted or returned to the WebView.
    static volatile int testBlockedRequests;
    static volatile int testUpstreamRequests;
    static volatile String testLastResolver;

    private final Object tunnelLock = new Object();
    private volatile boolean running;
    private ParcelFileDescriptor tunnel;
    private Thread worker;

    public static void start(Context context) {
        Intent intent = new Intent(context, QuietwallVpnService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
        else context.startService(intent);
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, QuietwallVpnService.class));
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        // The OS must never revive an old VPN just because it killed the process. Boot recovery
        // is performed only by QuietwallBootReceiver after it reads this explicit user setting.
        RuleStore.State initialState = RuleStore.read(this);
        if (!initialState.userEnabled || (initialState.unlockAt > 0 && System.currentTimeMillis() >= initialState.unlockAt)) {
            if (initialState.unlockAt > 0) RuleStore.setUserEnabled(this, false);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification());
        }
        startTunnelIfNeeded();
        return START_NOT_STICKY;
    }

    @Override public IBinder onBind(Intent intent) {
        return super.onBind(intent);
    }

    @Override public void onRevoke() {
        stopSelf();
        super.onRevoke();
    }

    @Override public void onDestroy() {
        closeTunnel();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        super.onDestroy();
    }

    private void startTunnelIfNeeded() {
        synchronized (tunnelLock) {
            if (running) return;
            try {
                tunnel = new Builder()
                        .setSession("Quietwall local DNS")
                        .setBlocking(true)
                        .addAddress(IPV4_GATEWAY, 32)
                        .addRoute(IPV4_DNS, 32)
                        .addDnsServer(IPV4_DNS)
                        .addAddress(IPV6_GATEWAY, 128)
                        .addRoute(IPV6_DNS, 128)
                        .addDnsServer(IPV6_DNS)
                        .establish();
                if (tunnel == null) { stopSelf(); return; }
                running = true;
                worker = new Thread(this::runTunnel, "quietwall-dns");
                worker.start();
            } catch (IllegalArgumentException | IllegalStateException ignored) {
                // The VPN API rejected configuration. Do not emit a query, rule, or network log.
                stopSelf();
            }
        }
    }

    private void runTunnel() {
        ParcelFileDescriptor descriptor;
        synchronized (tunnelLock) { descriptor = tunnel; }
        if (descriptor == null) return;
        try (FileInputStream input = new FileInputStream(descriptor.getFileDescriptor());
             FileOutputStream output = new FileOutputStream(descriptor.getFileDescriptor())) {
            byte[] buffer = new byte[65535];
            while (running) {
                int length = input.read(buffer);
                if (length <= 0) continue;
                IpPacket packet = IpPacket.parseUdp(buffer, length);
                if (packet == null || packet.destinationPort != 53) continue;
                byte[] query = new byte[packet.payloadLength];
                System.arraycopy(buffer, packet.payloadOffset, query, 0, packet.payloadLength);
                DnsMessage.Query parsed = DnsMessage.parseQuery(query, query.length);
                if (parsed == null) continue;

                RuleStore.State state = RuleStore.read(this);
                if (state.unlockAt > 0 && System.currentTimeMillis() >= state.unlockAt) {
                    RuleStore.setUserEnabled(this, false);
                    stopSelf();
                    break;
                }
                byte[] reply;
                if (RuleStore.isBlockingActive(state, System.currentTimeMillis()) && RuleMatcher.matches(parsed.name, state.rules)) {
                    testBlockedRequests++;
                    reply = DnsMessage.nxdomain(query, query.length, parsed);
                } else {
                    reply = resolveNormally(query);
                }
                if (reply == null) continue;
                byte[] framed = DnsPacketBuilder.reply(packet, reply);
                if (framed != null) {
                    synchronized (output) { output.write(framed); output.flush(); }
                }
            }
        } catch (IOException ignored) {
            // Closing the TUN descriptor is the normal shutdown signal.
        } finally {
            running = false;
        }
    }

    private byte[] resolveNormally(byte[] request) {
        for (InetAddress resolver : networkResolvers()) {
            try (DatagramSocket socket = new DatagramSocket()) {
                if (!protect(socket)) return null;
                socket.setSoTimeout(3500);
                socket.connect(resolver, 53);
                testUpstreamRequests++;
                testLastResolver = resolver.getHostAddress();
                socket.send(new DatagramPacket(request, request.length));
                byte[] response = new byte[65535];
                DatagramPacket received = new DatagramPacket(response, response.length);
                socket.receive(received);
                byte[] exact = new byte[received.getLength()];
                System.arraycopy(response, received.getOffset(), exact, 0, exact.length);
                return exact;
            } catch (IOException ignored) {
                // A network may advertise more than one resolver. Try the next one quietly.
            }
        }
        return null;
    }

    private List<InetAddress> networkResolvers() {
        List<InetAddress> results = new ArrayList<>();
        ConnectivityManager manager = getSystemService(ConnectivityManager.class);
        if (manager == null) return results;
        for (Network network : manager.getAllNetworks()) {
            NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
            if (capabilities == null || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue;
            LinkProperties link = manager.getLinkProperties(network);
            if (link == null) continue;
            for (InetAddress resolver : link.getDnsServers()) {
                if (!resolver.getHostAddress().equals(IPV4_DNS) && !resolver.getHostAddress().equals(IPV6_DNS)) results.add(resolver);
            }
        }
        return results;
    }

    static void resetTestObservations() {
        testBlockedRequests = 0;
        testUpstreamRequests = 0;
        testLastResolver = null;
    }

    private Notification notification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Quietwall DNS protection", NotificationManager.IMPORTANCE_LOW));
        }
        Intent launch = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        return builder
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Quietwall DNS protection is on")
                .setContentText("Filtering DNS locally. No browsing activity is logged.")
                .setContentIntent(pending)
                .setOngoing(true)
                .build();
    }

    private void closeTunnel() {
        synchronized (tunnelLock) {
            running = false;
            if (tunnel != null) {
                try { tunnel.close(); } catch (IOException ignored) { }
                tunnel = null;
            }
            if (worker != null) worker.interrupt();
            worker = null;
        }
    }
}
