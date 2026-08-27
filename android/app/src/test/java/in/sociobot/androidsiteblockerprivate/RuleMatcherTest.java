package in.sociobot.androidsiteblockerprivate;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

import java.util.Arrays;

public class RuleMatcherTest {
    @Test public void bareDomainMatchesApexAndSubdomains() {
        assertTrue(RuleMatcher.matches("example.com", Arrays.asList("example.com")));
        assertTrue(RuleMatcher.matches("cdn.news.example.com", Arrays.asList("example.com")));
        assertFalse(RuleMatcher.matches("notexample.com", Arrays.asList("example.com")));
    }

    @Test public void wildcardMatchesChildrenButNotApex() {
        assertTrue(RuleMatcher.matches("news.example.com.", Arrays.asList("*.example.com")));
        assertTrue(RuleMatcher.matches("deep.news.example.com", Arrays.asList("*.example.com")));
        assertFalse(RuleMatcher.matches("example.com", Arrays.asList("*.example.com")));
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsUnsafeRuleSyntax() {
        RuleMatcher.normalizePattern("*.example.com/path");
    }
}
