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
import android.os.ParcelFileDescriptor;
import android.util.Log;

import java.io.FileInputStream;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** Debug-preview instrumentation. It runs observable claims inside the exact signed APK. */
public final class ClaimInstrumentation extends Instrumentation {
    private static final String PACKAGE = "in.sociobot.androidsiteblockerprivate";
    private static final String PREFS = "quietwall_vpn";
    private String claim;
    private String probeDomain;

    @Override public void onCreate(Bundle arguments) {
        super.onCreate(arguments);
        claim = arguments == null ? null : arguments.getString("claim");
        probeDomain = arguments == null ? null : arguments.getString("domain");
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
        ensureVpnConsent(context);
        String domain = requiredProbeDomain();
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList(domain), 0);
        awaitExternalProbe("android-dns-filter", 20_000);
        require(QuietwallVpnService.testBlockedRequests > 0, "The external matching DNS request did not reach the filter.");
        require(QuietwallVpnService.testUpstreamRequests == 0, "A matching DNS request was sent upstream.");
    }

    private void privacyClaim(Context context) throws Exception {
        ensureVpnConsent(context);
        String domain = requiredProbeDomain();
        int uid = context.getApplicationInfo().uid;
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList(domain), 0);
        long sentBefore = TrafficStats.getUidTxBytes(uid);
        awaitExternalProbe("native-privacy", 20_000);
        long sentAfter = TrafficStats.getUidTxBytes(uid);
        if (sentBefore != TrafficStats.UNSUPPORTED && sentAfter != TrafficStats.UNSUPPORTED) {
            require(sentBefore == sentAfter, "Locally blocked request created app egress.");
        }
        require(QuietwallVpnService.testBlockedRequests > 0, "The external blocked request was not observed.");
        require(QuietwallVpnService.testUpstreamRequests == 0, "The blocked request reached an upstream resolver.");
        require(context.databaseList().length == 0, "A browsing database was created.");
        Map<String, ?> stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getAll();
        Set<String> expectedKeys = new HashSet<>(Arrays.asList("user_enabled", "rules", "schedule_enabled", "schedule_start", "schedule_end", "unlock_at"));
        require(expectedKeys.equals(stored.keySet()), "Runtime storage contains unexpected keys.");
        require(new HashSet<>(Arrays.asList(domain)).equals(stored.get("rules")), "Configured rule was not the only stored domain.");
    }

    private void resolverClaim(Context context) throws Exception {
        ensureVpnConsent(context);
        Set<String> resolvers = advertisedResolvers(context);
        require(!resolvers.isEmpty(), "No active-network resolver is available.");
        require(!resolvers.contains("10.99.0.2"), "Local VPN address appeared as an upstream resolver.");
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList("blocked.example"), 0);
        awaitExternalProbe("network-resolver", 10_000);
        require(QuietwallVpnService.testUpstreamRequests > 0, "The external allowed request was not sent upstream.");
        require(QuietwallVpnService.testLastResolver != null && resolvers.contains(QuietwallVpnService.testLastResolver), "Allowed request did not use an active non-VPN resolver.");
    }

    private void pauseClaim(Context context) throws Exception {
        ensureVpnConsent(context);
        String domain = requiredProbeDomain();
        QuietwallVpnService.resetTestObservations();
        // Start the tunnel before starting the compressed test timer. A cold emulator can take
        // well beyond the real eight-second test window to expose its first VPN network.
        startVpn(context, Arrays.asList(domain), 0);
        RuleStore.save(context, true, Arrays.asList(domain), false, "22:00", "07:00", System.currentTimeMillis() + 30_000);
        require(RuleStore.isUserEnabled(context), "Filtering stopped before expiry.");
        awaitExternalProbe("pause-delay", 45_000);
        require(QuietwallVpnService.testBlockedRequests > 0, "The request was not blocked before expiry.");
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
        ConnectivityManager manager = context.getSystemService(ConnectivityManager.class);
        long deadline = System.currentTimeMillis() + 30_000;
        while (System.currentTimeMillis() < deadline) {
            Network active = manager == null ? null : manager.getActiveNetwork();
            NetworkCapabilities capabilities = active == null ? null : manager.getNetworkCapabilities(active);
            LinkProperties properties = active == null ? null : manager.getLinkProperties(active);
            if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) && properties != null) {
                for (InetAddress resolver : properties.getDnsServers()) {
                    if ("10.99.0.2".equals(resolver.getHostAddress())) return;
                }
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Android did not make the Quietwall VPN its active DNS path.");
    }

    private static void awaitExternalProbe(String id, long milliseconds) throws Exception {
        Log.i("QuietwallClaim", "READY:" + id);
        Thread.sleep(milliseconds);
    }

    private void ensureVpnConsent(Context context) throws Exception {
        if (VpnService.prepare(context) == null) return;

        // A clean device lab grants the same Android app-op that the system consent dialog
        // records. Run it through UiAutomation as well as the host-side grant so the check is
        // deterministic across emulator images and users, then prove Android accepted it.
        try (ParcelFileDescriptor descriptor = getUiAutomation().executeShellCommand(
                "appops set " + PACKAGE + " ACTIVATE_VPN allow");
             FileInputStream output = new FileInputStream(descriptor.getFileDescriptor())) {
            byte[] buffer = new byte[256];
            while (output.read(buffer) >= 0) { /* Drain command output before checking. */ }
        }
        Thread.sleep(250);
        require(VpnService.prepare(context) == null, "Android VPN consent was not granted.");
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

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private String requiredProbeDomain() {
        if (probeDomain == null || probeDomain.trim().isEmpty()) throw new AssertionError("Pass -e domain <unique-domain>.");
        return probeDomain;
    }
}
