package in.sociobot.androidsiteblockerprivate;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Recreates the VPN after a reboot only when the user explicitly left protection armed. */
public final class QuietwallBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        RuleStore.State state = RuleStore.read(context);
        if (state.unlockAt > 0 && System.currentTimeMillis() >= state.unlockAt) {
            RuleStore.setUserEnabled(context, false);
            return;
        }
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) && state.userEnabled) {
            QuietwallVpnService.start(context);
        }
    }
}
