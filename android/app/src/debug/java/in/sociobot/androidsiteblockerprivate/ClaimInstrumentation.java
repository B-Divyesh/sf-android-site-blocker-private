package in.sociobot.androidsiteblockerprivate;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
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
import android.view.accessibility.AccessibilityNodeInfo;

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
        ensureVpnConsent(context);
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList("example.com"), 0);
        awaitExternalProbe("android-dns-filter", 10_000);
        require(QuietwallVpnService.testBlockedRequests > 0, "The external matching DNS request did not reach the filter.");
        require(QuietwallVpnService.testUpstreamRequests == 0, "A matching DNS request was sent upstream.");
    }

    private void privacyClaim(Context context) throws Exception {
        ensureVpnConsent(context);
        int uid = context.getApplicationInfo().uid;
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList("example.org"), 0);
        long sentBefore = TrafficStats.getUidTxBytes(uid);
        awaitExternalProbe("native-privacy", 10_000);
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
        require(new HashSet<>(Arrays.asList("example.org")).equals(stored.get("rules")), "Configured rule was not the only stored domain.");
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
        QuietwallVpnService.resetTestObservations();
        startVpn(context, Arrays.asList("example.net"), System.currentTimeMillis() + 8_000);
        require(RuleStore.isUserEnabled(context), "Filtering stopped before expiry.");
        awaitExternalProbe("pause-delay", 12_000);
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
        long deadline = System.currentTimeMillis() + 15_000;
        while (System.currentTimeMillis() < deadline) {
            if (manager != null) for (Network network : manager.getAllNetworks()) {
                NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
                if (capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Android did not expose the Quietwall VPN network.");
    }

    private static void awaitExternalProbe(String id, long milliseconds) throws Exception {
        Log.i("QuietwallClaim", "READY:" + id);
        Thread.sleep(milliseconds);
    }

    private void ensureVpnConsent(Context context) throws Exception {
        if (VpnService.prepare(context) == null) return;

        // Ask Android through the real system consent screen. The command first mirrors what a
        // device lab does for repeatable clean profiles; the UI path remains the fallback and proof.
        try (ParcelFileDescriptor descriptor = getUiAutomation().executeShellCommand("appops set " + PACKAGE + " ACTIVATE_VPN allow");
             FileInputStream output = new FileInputStream(descriptor.getFileDescriptor())) {
            byte[] buffer = new byte[256];
            while (output.read(buffer) >= 0) { /* Drain command output before checking the result. */ }
        }
        Thread.sleep(250);
        if (VpnService.prepare(context) == null) return;

        Intent consent = VpnService.prepare(context);
        require(consent != null, "VPN consent intent was unavailable.");
        consent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(consent);
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            AccessibilityNodeInfo root = getUiAutomation().getRootInActiveWindow();
            if (root != null) {
                AccessibilityNodeInfo action = findConsentAction(root);
                if (action != null && action.isEnabled()) action.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            }
            Thread.sleep(250);
            if (VpnService.prepare(context) == null) return;
        }
        throw new AssertionError("Android VPN consent was not approved.");
    }

    private static AccessibilityNodeInfo findConsentAction(AccessibilityNodeInfo node) {
        CharSequence viewId = node.getViewIdResourceName();
        CharSequence text = node.getText();
        if ((viewId != null && (viewId.toString().endsWith(":id/button1") || viewId.toString().endsWith(":id/ok")))
                || (text != null && ("OK".contentEquals(text) || "Allow".contentEquals(text)))) return node;
        for (int index = 0; index < node.getChildCount(); index++) {
            AccessibilityNodeInfo child = node.getChild(index);
            if (child == null) continue;
            AccessibilityNodeInfo found = findConsentAction(child);
            if (found != null) return found;
        }
        return null;
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
}
