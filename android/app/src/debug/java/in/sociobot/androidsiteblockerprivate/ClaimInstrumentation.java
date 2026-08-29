package in.sociobot.androidsiteblockerprivate;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.TrafficStats;
import android.net.VpnService;
import android.os.Bundle;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Debug-preview instrumentation. It runs observable claims inside the exact signed APK. */
public final class ClaimInstrumentation extends Instrumentation {
    private static final String PACKAGE = "in.sociobot.androidsiteblockerprivate";
    private static final String PREFS = "quietwall_vpn";
    private String claim;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        claim = arguments == null ? null : arguments.getString("claim");
        start();
    }

    @Override public void onStart() {
        Bundle result = new Bundle();
        int code = Activity.RESULT_OK;
        try {
            Context context = getTargetContext();
            reset(context);
            runClaim(context);
            result.putString("claim", claim);
            result.putString("status", "PASS");
            reset(context);
        } catch (Throwable error) {
            code = Activity.RESULT_CANCELED;
            result.putString("claim", claim);
            result.putString("status", "FAIL");
            result.putString("error", error.toString());
        }
        finish(code, result);
    }

    private void runClaim(Context context) throws Exception {
        if (claim == null) throw new AssertionError("Pass -e claim <claim-id>.");
        switch (claim) {
            case "android-dns-filter": blockedDnsClaim(context); break;
            case "native-privacy": privacyClaim(context); break;
            case "network-resolver": resolverClaim(context); break;
            case "filter-boundary": boundaryClaim(context); break;
            case "pause-delay": pauseClaim(context); break;
            default: throw new AssertionError("Unknown claim: " + claim);
        }
    }

    private void blockedDnsClaim(Context context) throws Exception {
        require(VpnService.prepare(context) == null, "VPN consent was not granted.");
        startVpn(context, Arrays.asList("blocked.example"), 0);
        byte[] query = query("blocked.example");
        byte[] response = exchange(query, 5000);
        require(query[0] == response[0] && query[1] == response[1], "DNS transaction id changed.");
        require((response[3] & 0x0f) == 3, "Matching request did not receive NXDOMAIN.");
    }

    private void privacyClaim(Context context) throws Exception {
        require(VpnService.prepare(context) == null, "VPN consent was not granted.");
        int uid = context.getApplicationInfo().uid;
        long sentBefore = TrafficStats.getUidTxBytes(uid);
        startVpn(context, Arrays.asList("blocked.example"), 0);
        require((exchange(query("blocked.example"), 5000)[3] & 0x0f) == 3, "Blocked request failed.");
        Thread.sleep(300);
        long sentAfter = TrafficStats.getUidTxBytes(uid);
        if (sentBefore != TrafficStats.UNSUPPORTED && sentAfter != TrafficStats.UNSUPPORTED) {
            require(sentBefore == sentAfter, "Locally blocked request created app egress.");
        }
        require(context.databaseList().length == 0, "A browsing database was created.");
        Map<String, ?> stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        Set<String> expectedKeys = new HashSet<>(Arrays.asList("user_enabled", "rules", "schedule_enabled", "schedule_start", "schedule_end", "unlock_at"));
        require(expectedKeys.equals(stored.keySet()), "Runtime storage contains unexpected keys.");
        require(new HashSet<>(Arrays.asList("blocked.example")).equals(stored.get("rules")), "Configured rule was not the only stored domain.");
    }

    private void resolverClaim(Context context) throws Exception {
        require(VpnService.prepare(context) == null, "VPN consent was not granted.");
        Set<String> resolvers = advertisedResolvers(context);
        require(!resolvers.isEmpty(), "No active-network resolver is available.");
        require(!resolvers.contains("10.99.0.2"), "Local VPN address appeared as an upstream resolver.");
        startVpn(context, Arrays.asList("blocked.example"), 0);
        byte[] query = query("example.com");
        byte[] response = exchange(query, 8000);
        require(query[0] == response[0] && query[1] == response[1], "Allowed DNS transaction id changed.");
        require((response[3] & 0x0f) != 3, "Allowed request received Quietwall NXDOMAIN.");
    }

    private void pauseClaim(Context context) throws Exception {
        require(VpnService.prepare(context) == null, "VPN consent was not granted.");
        startVpn(context, Arrays.asList("blocked.example"), System.currentTimeMillis() + 2500);
        require((exchange(query("blocked.example"), 5000)[3] & 0x0f) == 3, "Filtering was not active before expiry.");
        require(RuleStore.isUserEnabled(context), "Filtering stopped before expiry.");
        Thread.sleep(2750);
        try {
            exchange(query("blocked.example"), 1000);
        } catch (SocketTimeoutException expected) {
            // Expiry stops the tunnel before the packet receives a response.
        }
        long deadline = System.currentTimeMillis() + 3000;
        while (RuleStore.isUserEnabled(context) && System.currentTimeMillis() < deadline) Thread.sleep(100);
        require(!RuleStore.isUserEnabled(context), "Filtering stayed enabled after expiry.");
    }

    private void boundaryClaim(Context context) throws Exception {
        PackageInfo info = context.getPackageManager().getPackageInfo(PACKAGE, PackageManager.GET_PERMISSIONS | PackageManager.GET_SERVICES);
        Set<String> permissions = new HashSet<>();
        if (info.requestedPermissions != null) permissions.addAll(Arrays.asList(info.requestedPermissions));
        require(!permissions.contains("android.permission.BIND_DEVICE_ADMIN"), "Device-admin permission is present.");
        require(!permissions.contains("android.permission.MANAGE_DEVICE_POLICY"), "Device-policy permission is present.");
        boolean foundVpn = false;
        if (info.services != null) for (ServiceInfo service : info.services) {
            require(!"android.permission.BIND_DEVICE_ADMIN".equals(service.permission), "A service has device-admin authority.");
            if (service.name.endsWith("QuietwallVpnService")) {
                foundVpn = true;
                require("android.permission.BIND_VPN_SERVICE".equals(service.permission), "VPN service authority is incorrect.");
            }
        }
        require(foundVpn, "Installed APK has no VPN service.");
    }

    private static void startVpn(Context context, java.util.List<String> rules, long unlockAt) throws Exception {
        RuleStore.save(context, true, rules, false, "22:00", "07:00", unlockAt);
        QuietwallVpnService.start(context);
        Thread.sleep(1200);
    }

    private static void reset(Context context) throws Exception {
        RuleStore.setUserEnabled(context, false);
        QuietwallVpnService.stop(context);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
        Thread.sleep(250);
    }

    private static Set<String> advertisedResolvers(Context context) {
        Set<String> results = new HashSet<>();
        ConnectivityManager manager = context.getSystemService(ConnectivityManager.class);
        for (Network network : manager.getAllNetworks()) {
            NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
            if (capabilities == null || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) continue;
            LinkProperties properties = manager.getLinkProperties(network);
            if (properties == null) continue;
            for (InetAddress resolver : properties.getDnsServers()) results.add(resolver.getHostAddress());
        }
        return results;
    }

    private static byte[] exchange(byte[] query, int timeout) throws Exception {
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(timeout);
            socket.send(new DatagramPacket(query, query.length, InetAddress.getByName("10.99.0.2"), 53));
            byte[] response = new byte[512];
            DatagramPacket received = new DatagramPacket(response, response.length);
            socket.receive(received);
            return Arrays.copyOf(response, received.getLength());
        }
    }

    private static byte[] query(String domain) {
        byte[] labels = domain.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] message = new byte[12 + labels.length + 2 + 4];
        message[0] = 0x51; message[1] = 0x57;
        message[2] = 0x01; message[5] = 0x01;
        int write = 12;
        for (String label : domain.split("\\.")) {
            byte[] value = label.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
            message[write++] = (byte) value.length;
            System.arraycopy(value, 0, message, write, value.length);
            write += value.length;
        }
        message[write++] = 0;
        message[write++] = 0; message[write++] = 1;
        message[write++] = 0; message[write] = 1;
        return message;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
