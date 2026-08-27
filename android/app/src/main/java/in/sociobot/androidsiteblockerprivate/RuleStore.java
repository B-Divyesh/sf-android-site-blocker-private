package in.sociobot.androidsiteblockerprivate;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Private app storage. Quietwall stores settings only; it never stores DNS requests or responses. */
public final class RuleStore {
    private static final String PREFS = "quietwall_vpn";
    private static final String ENABLED = "user_enabled";
    private static final String RULES = "rules";
    private static final String SCHEDULE_ENABLED = "schedule_enabled";
    private static final String SCHEDULE_START = "schedule_start";
    private static final String SCHEDULE_END = "schedule_end";
    private static final String UNLOCK_AT = "unlock_at";

    private RuleStore() {}

    public static void save(Context context, boolean userEnabled, Collection<String> rules, boolean scheduleEnabled, String scheduleStart, String scheduleEnd, long unlockAt) {
        List<String> patterns = RuleMatcher.cleanPatterns(rules);
        SharedPreferences.Editor editor = prefs(context).edit()
                .putBoolean(ENABLED, userEnabled)
                .putStringSet(RULES, new LinkedHashSet<>(patterns))
                .putBoolean(SCHEDULE_ENABLED, scheduleEnabled)
                .putString(SCHEDULE_START, validTime(scheduleStart) ? scheduleStart : "22:00")
                .putString(SCHEDULE_END, validTime(scheduleEnd) ? scheduleEnd : "07:00")
                .putLong(UNLOCK_AT, Math.max(0, unlockAt));
        editor.apply();
    }

    public static State read(Context context) {
        SharedPreferences values = prefs(context);
        Set<String> savedRules = values.getStringSet(RULES, new LinkedHashSet<String>());
        List<String> rules = new ArrayList<>();
        if (savedRules != null) {
            for (String rule : savedRules) {
                try { rules.add(RuleMatcher.normalizePattern(rule)); } catch (IllegalArgumentException ignored) { /* Ignore corrupt entries. */ }
            }
        }
        return new State(
                values.getBoolean(ENABLED, false),
                rules,
                values.getBoolean(SCHEDULE_ENABLED, false),
                values.getString(SCHEDULE_START, "22:00"),
                values.getString(SCHEDULE_END, "07:00"),
                values.getLong(UNLOCK_AT, 0)
        );
    }

    public static boolean isUserEnabled(Context context) {
        return prefs(context).getBoolean(ENABLED, false);
    }

    public static void setUserEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(ENABLED, enabled).apply();
    }

    public static boolean isBlockingActive(State state, long now) {
        return isBlockingActiveAt(state, now);
    }

    /** Time-injectable policy boundary: kept deterministic for JVM verification. */
    static boolean isBlockingActiveAt(State state, long now) {
        if (!state.userEnabled || state.rules.isEmpty()) return false;
        if (state.unlockAt > 0 && now >= state.unlockAt) return false;
        if (!state.scheduleEnabled) return true;
        int start = minutes(state.scheduleStart);
        int end = minutes(state.scheduleEnd);
        if (start < 0 || end < 0 || start == end) return true;
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(now);
        int current = calendar.get(Calendar.HOUR_OF_DAY) * 60 + calendar.get(Calendar.MINUTE);
        return start < end ? current >= start && current < end : current >= start || current < end;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static boolean validTime(String value) {
        return value != null && value.matches("([01]\\d|2[0-3]):[0-5]\\d");
    }

    private static int minutes(String value) {
        if (!validTime(value)) return -1;
        return Integer.parseInt(value.substring(0, 2)) * 60 + Integer.parseInt(value.substring(3, 5));
    }

    public static final class State {
        public final boolean userEnabled;
        public final List<String> rules;
        public final boolean scheduleEnabled;
        public final String scheduleStart;
        public final String scheduleEnd;
        public final long unlockAt;

        State(boolean userEnabled, List<String> rules, boolean scheduleEnabled, String scheduleStart, String scheduleEnd, long unlockAt) {
            this.userEnabled = userEnabled;
            this.rules = rules;
            this.scheduleEnabled = scheduleEnabled;
            this.scheduleStart = scheduleStart;
            this.scheduleEnd = scheduleEnd;
            this.unlockAt = unlockAt;
        }
    }
}
