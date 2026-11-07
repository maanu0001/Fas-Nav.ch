import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { verifyStripeWebhook } from "@/lib/stripe";

describe("Stripe webhook signatures", () => {
  const secret = "whsec_test_launch_readiness";
  function signed(payload:string,at=Math.floor(Date.now()/1000)) {
    const digest=createHmac("sha256",secret).update(`${at}.${payload}`).digest("hex");
    return `t=${at},v1=${digest}`;
  }
  it("accepts a correctly signed event with its event identifier", () => {
    const old=process.env.STRIPE_WEBHOOK_SECRET;
    try {
      process.env.STRIPE_WEBHOOK_SECRET=secret;
      const payload=JSON.stringify({id:"evt_example",type:"invoice.paid",data:{object:{id:"in_1"}}});
      const event=verifyStripeWebhook(payload,signed(payload));
      assert.equal(event.id,"evt_example");
      assert.equal(event.type,"invoice.paid");
    } finally {if(old===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=old;}
  });
  it("rejects altered signed content", () => {
    const old=process.env.STRIPE_WEBHOOK_SECRET;
    try {
      process.env.STRIPE_WEBHOOK_SECRET=secret;
      const original='{"id":"evt_1"}';
      assert.throws(()=>verifyStripeWebhook('{"id":"evt_2"}',signed(original)));
    } finally {if(old===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=old;}
  });
  it("rejects expired signatures", () => {
    const old=process.env.STRIPE_WEBHOOK_SECRET;
    try {
      process.env.STRIPE_WEBHOOK_SECRET=secret;
      const payload='{"id":"evt_old"}';
      assert.throws(()=>verifyStripeWebhook(payload,signed(payload,Math.floor(Date.now()/1000)-3600)));
    } finally {if(old===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=old;}
  });
});
