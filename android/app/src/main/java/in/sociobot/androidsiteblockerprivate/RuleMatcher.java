package in.sociobot.androidsiteblockerprivate;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/** Domain-only matching shared by the bridge and VPN worker. */
public final class RuleMatcher {
    private RuleMatcher() {}

    public static List<String> cleanPatterns(Collection<String> rawPatterns) {
        LinkedHashSet<String> cleaned = new LinkedHashSet<>();
        for (String raw : rawPatterns) {
            cleaned.add(normalizePattern(raw));
        }
        return new ArrayList<>(cleaned);
    }

    public static String normalizePattern(String raw) {
        if (raw == null) throw new IllegalArgumentException("A rule is missing a domain.");
        String pattern = raw.trim().toLowerCase(Locale.ROOT);
        boolean wildcard = pattern.startsWith("*.");
        String host = wildcard ? pattern.substring(2) : pattern;
        if (host.endsWith(".")) host = host.substring(0, host.length() - 1);
        if (host.length() == 0 || host.length() > 253 || !host.contains(".")) {
            throw new IllegalArgumentException("Rules must be fully-qualified domains.");
        }
        for (String label : host.split("\\.", -1)) {
            if (label.length() == 0 || label.length() > 63 || label.startsWith("-") || label.endsWith("-") || !label.matches("[a-z0-9-]+")) {
                throw new IllegalArgumentException("A rule contains an invalid domain label.");
            }
        }
        return wildcard ? "*." + host : host;
    }

    public static boolean matches(String queriedName, Collection<String> patterns) {
        if (queriedName == null) return false;
        String host = queriedName.toLowerCase(Locale.ROOT);
        if (host.endsWith(".")) host = host.substring(0, host.length() - 1);
        if (host.length() == 0) return false;
        for (String pattern : patterns) {
            if (pattern.startsWith("*.")) {
                String suffix = pattern.substring(2);
                if (host.endsWith("." + suffix) && host.length() > suffix.length() + 1) return true;
            } else if (host.equals(pattern) || host.endsWith("." + pattern)) {
                return true;
            }
        }
        return false;
    }
}
