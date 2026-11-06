import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {marketplaceImageUrlsSchema} from "./marketplace-image-urls";

describe("Inseratebilder beim Speichern",()=>{
 it("erlaubt vom Bild-Upload gelieferte interne Pfade",()=>{
  assert.deepEqual(marketplaceImageUrlsSchema.parse(["/uploads/2026/11/fasnachtsfoto.webp"]),["/uploads/2026/11/fasnachtsfoto.webp"]);
 });
 it("erlaubt sichere HTTPS-Adressen und leere Galerien",()=>{
  assert.deepEqual(marketplaceImageUrlsSchema.parse(["https://images.example.ch/album/foto.webp"]),["https://images.example.ch/album/foto.webp"]);
  assert.deepEqual(marketplaceImageUrlsSchema.parse(undefined),[]);
 });
 it("weist Script-URLs und Pfadmanipulation zurück",()=>{
  for(const url of ["javascript:alert(1)","/uploads/../secrets.txt","//evil.example.ch/x.png","http://evil.example.ch/x.png","file:///etc/passwd"]){
   assert.equal(marketplaceImageUrlsSchema.safeParse([url]).success,false,url);
  }
 });
});