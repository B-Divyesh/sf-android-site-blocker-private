package in.sociobot.androidsiteblockerprivate;

import android.app.AlarmManager;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/** The only WebView-to-native bridge. It accepts rules but never returns or logs DNS activity. */
@CapacitorPlugin(name = "QuietwallVpn")
public final class QuietwallVpnPlugin extends Plugin {
    @PluginMethod
    public void apply(PluginCall call) {
        try {
            boolean enabled = call.getBoolean("protectionEnabled", false);
            boolean scheduleEnabled = call.getBoolean("scheduleEnabled", false);
            String scheduleStart = call.getString("scheduleStart", "22:00");
            String scheduleEnd = call.getString("scheduleEnd", "07:00");
            long unlockAt = call.getLong("unlockAtEpochMs", 0L);
            JSArray sourceRules = call.getArray("rules", new JSArray());
            List<String> rules = new ArrayList<>();
            for (int index = 0; index < sourceRules.length(); index++) {
                String pattern = sourceRules.optString(index, null);
                if (pattern == null) throw new IllegalArgumentException("A native rule must be a domain string.");
                rules.add(pattern);
            }
            RuleStore.save(getContext(), enabled, rules, scheduleEnabled, scheduleStart, scheduleEnd, unlockAt);
            scheduleUnlock(enabled, unlockAt);
            if (!enabled) {
                QuietwallVpnService.stop(getContext());
                call.resolve(result(false, false));
                return;
            }
            Intent consent = VpnService.prepare(getContext());
            if (consent == null) {
                QuietwallVpnService.start(getContext());
                call.resolve(result(true, false));
            } else {
                startActivityForResult(call, consent, "vpnConsentResult");
            }
        } catch (IllegalArgumentException error) {
            call.reject(error.getMessage(), "INVALID_CONFIGURATION", error);
        }
    }

    @ActivityCallback
    private void vpnConsentResult(PluginCall call, ActivityResult activityResult) {
        if (activityResult.getResultCode() == Activity.RESULT_OK && RuleStore.isUserEnabled(getContext())) {
            QuietwallVpnService.start(getContext());
            call.resolve(result(true, false));
        } else {
            // A cancelled Android consent sheet leaves the web UI and native state both disarmed.
            RuleStore.setUserEnabled(getContext(), false);
            scheduleUnlock(false, 0);
            QuietwallVpnService.stop(getContext());
            call.resolve(result(false, true));
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        RuleStore.State state = RuleStore.read(getContext());
        JSObject response = result(state.userEnabled, false);
        response.put("blockingActive", RuleStore.isBlockingActive(state, System.currentTimeMillis()));
        call.resolve(response);
    }

    private JSObject result(boolean enabled, boolean consentDenied) {
        JSObject response = new JSObject();
        response.put("enabled", enabled);
        response.put("consentDenied", consentDenied);
        return response;
    }

    private void scheduleUnlock(boolean enabled, long unlockAt) {
        AlarmManager alarms = getContext().getSystemService(AlarmManager.class);
        if (alarms == null) return;
        PendingIntent pending = PendingIntent.getBroadcast(
                getContext(), 741, new Intent(getContext(), QuietwallUnlockReceiver.class).setAction(QuietwallUnlockReceiver.ACTION_EXPIRE),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarms.cancel(pending);
        if (!enabled || unlockAt <= System.currentTimeMillis()) return;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, unlockAt, pending);
        } else {
            alarms.set(AlarmManager.RTC_WAKEUP, unlockAt, pending);
        }
    }
}
