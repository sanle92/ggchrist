import test from "node:test";
import assert from "node:assert/strict";
import {
  amountMinor,
  contribution,
  givingSchema,
} from "../lib/giving/shared.ts";
test("decimal amounts use integer hundredths without rounding input", () => {
  assert.equal(amountMinor("10.29", "USD"), 1029);
  assert.equal(amountMinor("50000", "UGX"), 5000000);
  for (const v of ["1.001", "NaN", "Infinity", "1e3", "-1", "0", "10001"])
    assert.throws(() => amountMinor(v, "USD"));
  assert.throws(() => amountMinor("10000.01", "UGX"));
  assert.throws(() => amountMinor("100", "CAD"));
});
test("optional contribution totals and UGX whole-shilling rounding", () => {
  assert.equal(contribution(5000, "USD"), 200);
  assert.equal(contribution(5000000, "UGX"), 200000);
  assert.equal(contribution(1000100, "UGX") % 100, 0);
});
test("server validates donor, currency, campaign, dedication and prayer inputs", () => {
  const valid = {
    attemptId: "12345678-1234-4234-a234-123456789012",
    amount: "50",
    currency: "USD",
    frequency: "one_time",
    purpose: "Where Needed Most",
    campaignId: null,
    donorName: "A Donor",
    donorEmail: "DONOR@example.test",
    donorPhone: "",
    anonymous: true,
    coverFees: false,
    dedicationType: "",
    dedicationName: "",
    dedicationMessage: "",
    prayerRequest: "",
    prayerTeamRequested: false,
  };
  assert.equal(givingSchema.parse(valid).donorEmail, "donor@example.test");
  for (const change of [
    { donorEmail: "invalid" },
    { campaignId: "untrusted" },
    { frequency: "weekly" },
    { dedicationType: "honor" },
    { prayerRequest: "x".repeat(3001) },
    { donorPhone: "<script>" },
  ])
    assert.equal(
      givingSchema.safeParse({ ...valid, ...change }).success,
      false,
    );
});

import { createHmac } from "node:crypto";
import { validStripeSignature } from "../lib/giving/signature.ts";
test("signed webhooks reject invalid signatures, replay timestamps and malformed timestamps", () => {
  const raw = '{"id":"evt_test"}',
    secret = "whsec_test",
    now = 1700000000;
  const sig = createHmac("sha256", secret)
    .update(`${now}.${raw}`)
    .digest("hex");
  assert.equal(
    validStripeSignature(raw, `t=${now},v1=${sig}`, secret, now),
    true,
  );
  assert.equal(
    validStripeSignature(raw, `t=${now},v1=invalid,v1=${sig}`, secret, now),
    true,
  );
  for (const header of [
    null,
    `t=NaN,v1=${sig}`,
    `t=${now},v1=wrong`,
    `t=${now},t=${now},v1=${sig}`,
  ])
    assert.equal(validStripeSignature(raw, header, secret, now), false);
  assert.equal(
    validStripeSignature(raw, `t=${now},v1=${sig}`, secret, now + 301),
    false,
  );
  assert.equal(
    validStripeSignature(raw + " ", `t=${now},v1=${sig}`, secret, now),
    false,
  );
});
