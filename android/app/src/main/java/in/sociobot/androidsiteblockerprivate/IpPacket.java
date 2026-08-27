package in.sociobot.androidsiteblockerprivate;

import java.util.Arrays;

/** Bounds-checked parser for unfragmented UDP packets received from Android's TUN file descriptor. */
public final class IpPacket {
    public static final int UDP = 17;

    public final int version;
    public final byte[] source;
    public final byte[] destination;
    public final int sourcePort;
    public final int destinationPort;
    public final int payloadOffset;
    public final int payloadLength;

    private IpPacket(int version, byte[] source, byte[] destination, int sourcePort, int destinationPort, int payloadOffset, int payloadLength) {
        this.version = version;
        this.source = source;
        this.destination = destination;
        this.sourcePort = sourcePort;
        this.destinationPort = destinationPort;
        this.payloadOffset = payloadOffset;
        this.payloadLength = payloadLength;
    }

    public static IpPacket parseUdp(byte[] packet, int available) {
        if (packet == null || available < 1 || available > packet.length) return null;
        int version = (packet[0] >>> 4) & 0x0f;
        if (version == 4) return parseIpv4(packet, available);
        if (version == 6) return parseIpv6(packet, available);
        return null;
    }

    private static IpPacket parseIpv4(byte[] packet, int available) {
        if (available < 20) return null;
        int headerLength = (packet[0] & 0x0f) * 4;
        int totalLength = u16(packet, 2);
        if (headerLength < 20 || headerLength > available || totalLength < headerLength + 8 || totalLength > available) return null;
        int flagsAndOffset = u16(packet, 6);
        if ((flagsAndOffset & 0x3fff) != 0 || (packet[9] & 0xff) != UDP) return null;
        return udp(packet, 4, headerLength, totalLength - headerLength);
    }

    private static IpPacket parseIpv6(byte[] packet, int available) {
        if (available < 48) return null;
        int packetEnd = 40 + u16(packet, 4);
        if (packetEnd > available) return null;
        int nextHeader = packet[6] & 0xff;
        int position = 40;
        int headers = 0;
        while (nextHeader != UDP) {
            if (++headers > 8 || position + 2 > packetEnd) return null;
            if (nextHeader == 44) { // Fragment: never accept fragments, including a first fragment with more data.
                if (position + 8 > packetEnd || (u16(packet, position + 2) & 0xfff9) != 0) return null;
                nextHeader = packet[position] & 0xff;
                position += 8;
            } else if (nextHeader == 0 || nextHeader == 43 || nextHeader == 60) {
                int size = ((packet[position + 1] & 0xff) + 1) * 8;
                if (position + size > packetEnd) return null;
                nextHeader = packet[position] & 0xff;
                position += size;
            } else if (nextHeader == 51) { // Authentication header
                int size = ((packet[position + 1] & 0xff) + 2) * 4;
                if (position + size > packetEnd) return null;
                nextHeader = packet[position] & 0xff;
                position += size;
            } else {
                return null;
            }
        }
        return udp(packet, 16, position, packetEnd - position);
    }

    private static IpPacket udp(byte[] packet, int addressLength, int udpOffset, int transportLength) {
        if (transportLength < 8 || udpOffset + 8 > packet.length) return null;
        int udpLength = u16(packet, udpOffset + 4);
        if (udpLength < 8 || udpLength > transportLength) return null;
        byte[] source = Arrays.copyOfRange(packet, addressLength == 4 ? 12 : 8, (addressLength == 4 ? 12 : 8) + addressLength);
        byte[] destination = Arrays.copyOfRange(packet, addressLength == 4 ? 16 : 24, (addressLength == 4 ? 16 : 24) + addressLength);
        return new IpPacket(addressLength == 4 ? 4 : 6, source, destination, u16(packet, udpOffset), u16(packet, udpOffset + 2), udpOffset + 8, udpLength - 8);
    }

    private static int u16(byte[] value, int offset) {
        return ((value[offset] & 0xff) << 8) | (value[offset + 1] & 0xff);
    }
}
