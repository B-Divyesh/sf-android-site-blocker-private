package in.sociobot.androidsiteblockerprivate;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Arrays;
import java.util.Calendar;
import java.util.TimeZone;

public class RuleStorePolicyTest {
    private static final TimeZone ZONE = TimeZone.getDefault();

    @Test public void honorsNormalAndOvernightFocusHours() {
        RuleStore.State normal = state(true, true, "09:00", "17:00", 0);
        assertTrue(RuleStore.isBlockingActiveAt(normal, at(10, 0)));
        assertFalse(RuleStore.isBlockingActiveAt(normal, at(17, 0)));

        RuleStore.State overnight = state(true, true, "22:00", "07:00", 0);
        assertTrue(RuleStore.isBlockingActiveAt(overnight, at(23, 0)));
        assertTrue(RuleStore.isBlockingActiveAt(overnight, at(6, 59)));
        assertFalse(RuleStore.isBlockingActiveAt(overnight, at(7, 0)));
    }

    @Test public void pauseExpiryAndDisarmedStateCannotFilter() {
        long now = at(12, 0);
        assertTrue(RuleStore.isBlockingActiveAt(state(true, false, "22:00", "07:00", now + 60_000), now));
        assertFalse(RuleStore.isBlockingActiveAt(state(true, false, "22:00", "07:00", now), now));
        assertFalse(RuleStore.isBlockingActiveAt(state(false, false, "22:00", "07:00", 0), now));
        assertFalse(RuleStore.isBlockingActiveAt(new RuleStore.State(true, Arrays.<String>asList(), false, "22:00", "07:00", 0), now));
    }

    private static RuleStore.State state(boolean enabled, boolean scheduled, String start, String end, long unlockAt) {
        return new RuleStore.State(enabled, Arrays.asList("example.com"), scheduled, start, end, unlockAt);
    }

    private static long at(int hour, int minute) {
        Calendar calendar = Calendar.getInstance(ZONE);
        calendar.set(2026, Calendar.JANUARY, 2, hour, minute, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }
}
