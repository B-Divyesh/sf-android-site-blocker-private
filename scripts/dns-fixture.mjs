import dgram from 'node:dgram';
import { pathToFileURL } from 'node:url';

export function answerQuery(query) {
  if (!Buffer.isBuffer(query) || query.length < 17) return null;
  let offset = 12;
  while (offset < query.length && query[offset] !== 0) {
    const labelLength = query[offset];
    if (labelLength > 63 || offset + labelLength >= query.length) return null;
    offset += labelLength + 1;
  }
  if (offset + 5 > query.length) return null;
  const questionEnd = offset + 5;
  const type = query.readUInt16BE(offset + 1);
  const address = type === 1
    ? Buffer.from([203, 0, 113, 1])
    : type === 28
      ? Buffer.from('20010db8000000000000000000000001', 'hex')
      : null;
  const header = Buffer.alloc(12);
  query.copy(header, 0, 0, 2);
  header.writeUInt16BE(0x8180, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(address ? 1 : 0, 6);
  if (!address) return Buffer.concat([header, query.subarray(12, questionEnd)]);
  const answer = Buffer.alloc(12 + address.length);
  answer.writeUInt16BE(0xc00c, 0);
  answer.writeUInt16BE(type, 2);
  answer.writeUInt16BE(1, 4);
  answer.writeUInt32BE(60, 6);
  answer.writeUInt16BE(address.length, 10);
  address.copy(answer, 12);
  return Buffer.concat([header, query.subarray(12, questionEnd), answer]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const portArgument = process.argv.find((argument) => argument.startsWith('--port='));
  const port = Number(portArgument?.slice(7) ?? 53);
  const server = dgram.createSocket('udp4');
  server.on('message', (query, client) => {
    const response = answerQuery(query);
    if (response) server.send(response, client.port, client.address);
  });
  server.on('error', (error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
    server.close();
  });
  // QEMU's DNS proxy runs on the host and reaches the configured resolver here.
  // Keep the fixture loopback-only so it cannot accept traffic outside the job.
  server.bind(port, '127.0.0.1', () => process.stdout.write(`READY dns-fixture 127.0.0.1:${port}\n`));
}
