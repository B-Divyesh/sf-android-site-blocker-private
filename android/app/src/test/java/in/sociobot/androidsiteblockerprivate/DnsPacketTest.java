package in.sociobot.androidsiteblockerprivate;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class DnsPacketTest {
    private static final byte[] QUERY = new byte[] {
            (byte) 0xca, (byte) 0xfe, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x04, 'n', 'e', 'w', 's', 0x07, 'e', 'x', 'a', 'm', 'p', 'l', 'e', 0x03, 'c', 'o', 'm', 0x00,
            0x00, 0x01, 0x00, 0x01
    };

    @Test public void parsesAndAnswersIpv4DnsWithoutChangingQuestion() {
        IpPacket request = IpPacket.parseUdp(ipv4Request(), ipv4Request().length);
        assertNotNull(request);
        assertEquals(4, request.version);
        assertEquals(53000, request.sourcePort);
        DnsMessage.Query question = DnsMessage.parseQuery(QUERY, QUERY.length);
        assertNotNull(question);
        assertEquals("news.example.com", question.name);
        byte[] blocked = DnsMessage.nxdomain(QUERY, QUERY.length, question);
        assertNotNull(blocked);
        assertEquals(3, blocked[3] & 0x0f);
        IpPacket reply = IpPacket.parseUdp(DnsPacketBuilder.reply(request, blocked), 20 + 8 + blocked.length);
        assertNotNull(reply);
        assertEquals(53, reply.sourcePort);
        assertEquals(53000, reply.destinationPort);
        assertArrayEquals(slice(QUERY, 12, question.questionEnd), slice(blocked, 12, question.questionEnd));
    }

    @Test public void parsesAndAnswersIpv6Dns() {
        byte[] requestBytes = ipv6Request();
        IpPacket request = IpPacket.parseUdp(requestBytes, requestBytes.length);
        assertNotNull(request);
        assertEquals(6, request.version);
        byte[] reply = DnsPacketBuilder.reply(request, QUERY);
        assertNotNull(reply);
        IpPacket response = IpPacket.parseUdp(reply, reply.length);
        assertNotNull(response);
        assertEquals(53, response.sourcePort);
        assertEquals(53001, response.destinationPort);
        assertEquals(QUERY.length, response.payloadLength);
    }

    @Test public void rejectsTruncatedAndFragmentedPacketsDeterministically() {
        assertNull(IpPacket.parseUdp(new byte[] { 0x45 }, 1));
        byte[] fragmented = ipv4Request();
        fragmented[6] = 0x20;
        assertNull(IpPacket.parseUdp(fragmented, fragmented.length));
        byte[] compressedQuestion = QUERY.clone();
        compressedQuestion[12] = (byte) 0xc0;
        assertNull(DnsMessage.parseQuery(compressedQuestion, compressedQuestion.length));
    }

    private static byte[] ipv4Request() {
        byte[] packet = new byte[20 + 8 + QUERY.length];
        packet[0] = 0x45;
        put16(packet, 2, packet.length);
        packet[8] = 64;
        packet[9] = 17;
        packet[12] = 10; packet[13] = 99; packet[14] = 0; packet[15] = 1;
        packet[16] = 10; packet[17] = 99; packet[18] = 0; packet[19] = 2;
        put16(packet, 20, 53000); put16(packet, 22, 53); put16(packet, 24, 8 + QUERY.length);
        System.arraycopy(QUERY, 0, packet, 28, QUERY.length);
        return packet;
    }

    private static byte[] ipv6Request() {
        byte[] packet = new byte[40 + 8 + QUERY.length];
        packet[0] = 0x60;
        put16(packet, 4, 8 + QUERY.length);
        packet[6] = 17; packet[7] = 64;
        packet[23] = 1; // fd51:...::1 source
        packet[39] = 2; // fd51:...::2 destination
        put16(packet, 40, 53001); put16(packet, 42, 53); put16(packet, 44, 8 + QUERY.length);
        System.arraycopy(QUERY, 0, packet, 48, QUERY.length);
        return packet;
    }

    private static void put16(byte[] value, int offset, int number) {
        value[offset] = (byte) (number >>> 8);
        value[offset + 1] = (byte) number;
    }

    private static byte[] slice(byte[] value, int start, int end) {
        byte[] result = new byte[end - start];
        System.arraycopy(value, start, result, 0, result.length);
        return result;
    }
}
