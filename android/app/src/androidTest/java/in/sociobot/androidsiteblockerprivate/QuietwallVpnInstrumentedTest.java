package in.sociobot.androidsiteblockerprivate;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

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

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RunWith(AndroidJUnit4.class)
public class QuietwallVpnInstrumentedTest {
    private static final String PACKAGE = "in.sociobot.androidsiteblockerprivate";
    private static final String PREFS = "quietwall_vpn";
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

    @Before public void resetAppState() throws Exception {
        QuietwallVpnService.stop(context);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
        Thread.sleep(250);
    }

    @After public void stopVpn() throws Exception {
        RuleStore.setUserEnabled(context, false);
        QuietwallVpnService.stop(context);
        Thread.sleep(250);
    }

    @Test public void matchingDnsRequestReceivesNxdomainThroughVpnTunnel() throws Exception {
        assertEquals(PACKAGE, context.getPackageName());
        assertNull("The clean emulator must grant Android VPN consent before this test", VpnService.prepare(context));
        startVpn(Arrays.asList("blocked.example"), 0);

        byte[] query = query("blocked.example");
        byte[] response = exchange(query, 5000);
        assertEquals("DNS transaction id must be preserved", query[0], response[0]);
        assertEquals("DNS transaction id must be preserved", query[1], response[1]);
        assertEquals("A matching domain must receive NXDOMAIN", 3, response[3] & 0x0f);

    }

    @Test public void allowedDnsRequestUsesCurrentNetworkOutsideVpnLoop() throws Exception {
        assertNull(VpnService.prepare(context));
        Set<String> advertisedResolvers = advertisedResolvers();
        assertFalse("The emulator needs an active network resolver", advertisedResolvers.isEmpty());
        assertFalse(advertisedResolvers.contains("10.99.0.2"));
        assertFalse(advertisedResolvers.contains("fd51:7177:616c:6c00:0:0:0:2"));
        startVpn(Arrays.asList("blocked.example"), 0);

        byte[] query = query("example.com");
        byte[] response = exchange(query, 8000);
        assertEquals(query[0], response[0]);
        assertEquals(query[1], response[1]);
        assertFalse("An allowed name must not receive Quietwall's local NXDOMAIN", (response[3] & 0x0f) == 3);
    }

    @Test public void blockedFlowHasNoEgressOrBrowsingLog() throws Exception {
        assertNull(VpnService.prepare(context));
        int uid = context.getApplicationInfo().uid;
        long sentBefore = TrafficStats.getUidTxBytes(uid);
        startVpn(Arrays.asList("blocked.example"), 0);
        byte[] response = exchange(query("blocked.example"), 5000);
        assertEquals(3, response[3] & 0x0f);
        Thread.sleep(300);
        long sentAfter = TrafficStats.getUidTxBytes(uid);
        if (sentBefore != TrafficStats.UNSUPPORTED && sentAfter != TrafficStats.UNSUPPORTED) {
            assertEquals("A locally blocked request must not create app egress", sentBefore, sentAfter);
        }

        assertEquals("Quietwall must not create a browsing database", 0, context.databaseList().length);
        Map<String, ?> stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        assertEquals(new HashSet<>(Arrays.asList("user_enabled", "rules", "schedule_enabled", "schedule_start", "schedule_end", "unlock_at")), stored.keySet());
        assertEquals(new HashSet<>(Arrays.asList("blocked.example")), stored.get("rules"));
    }

    @Test public void pauseDelayKeepsVpnActiveUntilExpiry() throws Exception {
        assertNull(VpnService.prepare(context));
        long unlockAt = System.currentTimeMillis() + 2500;
        startVpn(Arrays.asList("blocked.example"), unlockAt);
        assertEquals(3, exchange(query("blocked.example"), 5000)[3] & 0x0f);
        assertTrue("Filtering must remain enabled before the delay ends", RuleStore.isUserEnabled(context));

        Thread.sleep(2750);
        try {
            exchange(query("blocked.example"), 1000);
        } catch (SocketTimeoutException expected) {
            // The expired packet stops the tunnel before a response is written.
        }
        long deadline = System.currentTimeMillis() + 3000;
        while (RuleStore.isUserEnabled(context) && System.currentTimeMillis() < deadline) Thread.sleep(100);
        assertFalse("Filtering must turn off after the delay ends", RuleStore.isUserEnabled(context));
    }

    @Test public void installedManifestLimitsEnforcementToVpnService() throws Exception {
        PackageInfo info = context.getPackageManager().getPackageInfo(PACKAGE, PackageManager.GET_PERMISSIONS | PackageManager.GET_SERVICES);
        Set<String> permissions = new HashSet<>();
        if (info.requestedPermissions != null) permissions.addAll(Arrays.asList(info.requestedPermissions));
        assertFalse(permissions.contains("android.permission.BIND_DEVICE_ADMIN"));
        assertFalse(permissions.contains("android.permission.MANAGE_DEVICE_POLICY"));
        boolean foundVpnService = false;
        if (info.services != null) for (ServiceInfo service : info.services) {
            assertFalse("No installed service may use device-admin authority", "android.permission.BIND_DEVICE_ADMIN".equals(service.permission));
            if (service.name.endsWith("QuietwallVpnService")) {
                foundVpnService = true;
                assertEquals("android.permission.BIND_VPN_SERVICE", service.permission);
            }
        }
        assertTrue("The installed APK must expose the Android VPN service", foundVpnService);
    }

    private void startVpn(java.util.List<String> rules, long unlockAt) throws Exception {
        RuleStore.save(context, true, rules, false, "22:00", "07:00", unlockAt);
        QuietwallVpnService.start(context);
        Thread.sleep(1200);
    }

    private Set<String> advertisedResolvers() {
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
}
