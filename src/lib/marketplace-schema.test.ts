import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listingSchema } from "@/lib/marketplace";

describe("Inserate speichern",()=>{
 it("akzeptiert den vollständigen Formular-Payload mit internem Bildpfad",()=>{
  const input={
   organizationId:"cltestorg123",title:"Guggenmusik sucht Auftritt",
   description:"Wir suchen einen Auftritt in der Region für eine Gruppe.",
   category:"AUFTRITTE",listingType:"SUCHE",city:"Luzern",canton:"LU",
   price:null,date:null,imageUrls:["/uploads/2026/11/beispiel-bild.webp"],
   details:{duration:"30 Minuten",contact:{mode:"INTERNAL",email:"",phone:""}}
  };
  const parsed=listingSchema.parse(input);
  assert.equal(parsed.imageUrls[0],"/uploads/2026/11/beispiel-bild.webp");
  assert.deepEqual(parsed.details?.contact,{mode:"INTERNAL",email:"",phone:""});
 });
 it("verweigert ungültige Formulardaten eindeutig",()=>{
  assert.equal(listingSchema.safeParse({organizationId:"x",title:"Hi"}).success,false);
 });
});