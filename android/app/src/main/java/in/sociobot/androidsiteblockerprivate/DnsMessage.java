package in.sociobot.androidsiteblockerprivate;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Strict, allocation-light DNS question parser. It never follows compression pointers in a query. */
public final class DnsMessage {
    private DnsMessage() {}

    public static Query parseQuery(byte[] message, int length) {
        if (message == null || length < 17 || length > message.length) return null;
        int questions = u16(message, 4);
        if (questions < 1) return null;
        int position = 12;
        String firstName = null;
        for (int question = 0; question < questions; question++) {
            NameResult name = readName(message, position, length);
            if (name == null || name.next + 4 > length) return null;
            if (question == 0) firstName = name.value;
            position = name.next + 4; // QTYPE and QCLASS
        }
        return firstName == null ? null : new Query(firstName, position);
    }

    public static byte[] nxdomain(byte[] request, int length, Query query) {
        if (query == null || query.questionEnd > length || length > request.length) return null;
        byte[] response = new byte[query.questionEnd];
        System.arraycopy(request, 0, response, 0, query.questionEnd);
        int flags = u16(request, 2);
        flags = 0x8000 | (flags & 0x7900) | 0x0080 | 0x0003; // QR, opcode/RD, RA, NXDOMAIN
        response[2] = (byte) (flags >>> 8);
        response[3] = (byte) flags;
        response[6] = response[7] = response[8] = response[9] = response[10] = response[11] = 0;
        return response;
    }

    private static NameResult readName(byte[] value, int position, int limit) {
        StringBuilder name = new StringBuilder();
        while (position < limit) {
            int labelLength = value[position] & 0xff;
            if (labelLength == 0) return new NameResult(name.toString().toLowerCase(Locale.ROOT), position + 1);
            // Compression in DNS questions is unusual and can make a malicious packet recursive.
            if ((labelLength & 0xc0) != 0 || labelLength > 63 || position + 1 + labelLength > limit) return null;
            if (name.length() > 0) name.append('.');
            name.append(new String(value, position + 1, labelLength, StandardCharsets.US_ASCII));
            position += labelLength + 1;
            if (name.length() > 253) return null;
        }
        return null;
    }

    private static int u16(byte[] value, int offset) {
        return ((value[offset] & 0xff) << 8) | (value[offset + 1] & 0xff);
    }

    public static final class Query {
        public final String name;
        public final int questionEnd;

        Query(String name, int questionEnd) {
            this.name = name;
            this.questionEnd = questionEnd;
        }
    }

    private static final class NameResult {
        final String value;
        final int next;

        NameResult(String value, int next) {
            this.value = value;
            this.next = next;
        }
    }
}
