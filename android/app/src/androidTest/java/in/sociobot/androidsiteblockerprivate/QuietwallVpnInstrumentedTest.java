package in.sociobot.androidsiteblockerprivate;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import android.content.Context;
import android.net.VpnService;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.Arrays;

@RunWith(AndroidJUnit4.class)
public class QuietwallVpnInstrumentedTest {
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();

    @After public void stopVpn() {
        RuleStore.setUserEnabled(context, false);
        QuietwallVpnService.stop(context);
    }

    @Test public void matchingDnsRequestReceivesNxdomainThroughVpnTunnel() throws Exception {
        assertEquals("in.sociobot.androidsiteblockerprivate", context.getPackageName());
        assertNull("The test runner must grant Android VPN consent with appops before this test", VpnService.prepare(context));
        RuleStore.save(context, true, Arrays.asList("blocked.example"), false, "22:00", "07:00", 0);
        QuietwallVpnService.start(context);
        Thread.sleep(1200);

        byte[] query = query("blocked.example");
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(5000);
            socket.send(new DatagramPacket(query, query.length, InetAddress.getByName("10.99.0.2"), 53));
            byte[] response = new byte[512];
            DatagramPacket received = new DatagramPacket(response, response.length);
            socket.receive(received);
            assertEquals("DNS transaction id must be preserved", query[0], response[0]);
            assertEquals("DNS transaction id must be preserved", query[1], response[1]);
            assertEquals("A matching domain must receive NXDOMAIN", 3, response[3] & 0x0f);
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
