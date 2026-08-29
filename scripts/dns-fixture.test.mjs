import assert from 'node:assert/strict';
import test from 'node:test';
import { answerQuery } from './dns-fixture.mjs';

function query(type) {
  return Buffer.from([
    0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x05, 0x70, 0x72, 0x6f, 0x62, 0x65,
    0x07, 0x65, 0x78, 0x61, 0x6d, 0x70, 0x6c, 0x65,
    0x00, 0x00, type, 0x00, 0x01
  ]);
}

test('the emulator DNS fixture returns deterministic A and AAAA answers', () => {
  const ipv4 = answerQuery(query(1));
  const ipv6 = answerQuery(query(28));
  assert.ok(ipv4);
  assert.ok(ipv6);
  assert.equal(ipv4.readUInt16BE(6), 1);
  assert.deepEqual([...ipv4.subarray(-4)], [203, 0, 113, 1]);
  assert.equal(ipv6.readUInt16BE(6), 1);
  assert.equal(ipv6.subarray(-16).toString('hex'), '20010db8000000000000000000000001');
});

test('the emulator DNS fixture rejects malformed packets', () => {
  assert.equal(answerQuery(Buffer.alloc(4)), null);
  const malformed = query(1);
  malformed[12] = 64;
  assert.equal(answerQuery(malformed), null);
});
