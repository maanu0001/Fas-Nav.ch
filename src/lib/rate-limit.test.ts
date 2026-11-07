import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";

describe("Request throttling", () => {
 it("permits the threshold and blocks additional attempts", () => {
  const key="test:login:"+Date.now()+":"+Math.random();
  assert.equal(checkRateLimit(key,2,60_000).ok,true);
  assert.equal(checkRateLimit(key,2,60_000).ok,true);
  const blocked=checkRateLimit(key,2,60_000);
  assert.equal(blocked.ok,false);
  assert.ok(blocked.retryAfterSeconds>0);
 });
 it("uses the request IP consistently", () => {
  const r=new Request("https://fas-nav.ch/api/contact",{headers:{"x-real-ip":"203.0.113.9","x-forwarded-for":"198.51.100.7, 192.0.2.10"}});
  assert.equal(clientKey(r,"contact"),"contact:203.0.113.9");
 });
});
