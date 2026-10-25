import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

describe("nonce persistence contract", () => {
  it("schema declares nonce unique so concurrent duplicates cannot both persist", () => {
    const schemaContract = Prisma.dmmf.datamodel.models.find(m => m.name === "PaymentIntent");
    const nonce = schemaContract?.fields.find(f => f.name === "nonce");
    expect(nonce?.isUnique).toBe(true);
  });
});
