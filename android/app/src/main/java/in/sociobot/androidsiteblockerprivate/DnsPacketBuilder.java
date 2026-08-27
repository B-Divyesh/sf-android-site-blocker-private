package in.sociobot.androidsiteblockerprivate;

/** Creates valid UDP DNS replies for IPv4 and IPv6 without reflecting malformed input. */
public final class DnsPacketBuilder {
    private DnsPacketBuilder() {}

    public static byte[] reply(IpPacket request, byte[] dnsMessage) {
        if (request == null || dnsMessage == null || dnsMessage.length > 65507) return null;
        int udpLength = 8 + dnsMessage.length;
        if (request.version == 4) return ipv4(request, dnsMessage, udpLength);
        if (request.version == 6) return ipv6(request, dnsMessage, udpLength);
        return null;
    }

    private static byte[] ipv4(IpPacket request, byte[] dns, int udpLength) {
        byte[] result = new byte[20 + udpLength];
        result[0] = 0x45;
        result[1] = 0;
        put16(result, 2, result.length);
        put16(result, 4, 0);
        put16(result, 6, 0);
        result[8] = 64;
        result[9] = IpPacket.UDP;
        System.arraycopy(request.destination, 0, result, 12, 4);
        System.arraycopy(request.source, 0, result, 16, 4);
        put16(result, 10, checksum(result, 0, 20, 0));
        put16(result, 20, request.destinationPort);
        put16(result, 22, request.sourcePort);
        put16(result, 24, udpLength);
        System.arraycopy(dns, 0, result, 28, dns.length);
        int checksum = udpChecksum(result, 4, 20, udpLength);
        put16(result, 26, checksum == 0 ? 0xffff : checksum);
        return result;
    }

    private static byte[] ipv6(IpPacket request, byte[] dns, int udpLength) {
        byte[] result = new byte[40 + udpLength];
        result[0] = 0x60;
        put16(result, 4, udpLength);
        result[6] = IpPacket.UDP;
        result[7] = 64;
        System.arraycopy(request.destination, 0, result, 8, 16);
        System.arraycopy(request.source, 0, result, 24, 16);
        put16(result, 40, request.destinationPort);
        put16(result, 42, request.sourcePort);
        put16(result, 44, udpLength);
        System.arraycopy(dns, 0, result, 48, dns.length);
        int checksum = udpChecksum(result, 16, 40, udpLength);
        put16(result, 46, checksum == 0 ? 0xffff : checksum);
        return result;
    }

    private static int udpChecksum(byte[] packet, int addressLength, int udpOffset, int udpLength) {
        long sum = 0;
        if (addressLength == 4) {
            sum += word(packet, 12) + word(packet, 14) + word(packet, 16) + word(packet, 18);
            sum += IpPacket.UDP + udpLength;
        } else {
            for (int offset = 8; offset < 40; offset += 2) sum += word(packet, offset);
            sum += (udpLength >>> 16) + (udpLength & 0xffff) + IpPacket.UDP;
        }
        return checksum(packet, udpOffset, udpLength, sum);
    }

    private static int checksum(byte[] value, int offset, int length, long seed) {
        long sum = seed;
        int end = offset + length;
        for (int position = offset; position + 1 < end; position += 2) sum += word(value, position);
        if ((length & 1) != 0) sum += (value[end - 1] & 0xff) << 8;
        while ((sum >>> 16) != 0) sum = (sum & 0xffff) + (sum >>> 16);
        return (int) (~sum) & 0xffff;
    }

    private static int word(byte[] value, int offset) {
        return ((value[offset] & 0xff) << 8) | (value[offset + 1] & 0xff);
    }

    private static void put16(byte[] value, int offset, int number) {
        value[offset] = (byte) (number >>> 8);
        value[offset + 1] = (byte) number;
    }
}
