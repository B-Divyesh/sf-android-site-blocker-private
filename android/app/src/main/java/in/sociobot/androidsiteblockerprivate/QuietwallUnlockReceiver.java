package in.sociobot.androidsiteblockerprivate;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Ends a requested delayed pause even when the WebView is no longer open. */
public final class QuietwallUnlockReceiver extends BroadcastReceiver {
    public static final String ACTION_EXPIRE = "in.sociobot.androidsiteblockerprivate.UNLOCK_EXPIRED";

    @Override public void onReceive(Context context, Intent intent) {
        if (!ACTION_EXPIRE.equals(intent.getAction())) return;
        RuleStore.State state = RuleStore.read(context);
        if (state.unlockAt > 0 && System.currentTimeMillis() >= state.unlockAt) {
            RuleStore.setUserEnabled(context, false);
            QuietwallVpnService.stop(context);
        }
    }
}
