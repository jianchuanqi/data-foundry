import test from "node:test";
import { normalizeProfile } from "../../scripts/lib/import-curation/internal/profiles-config.mjs";
import {
  flowPrewriteIdentityBlockers,
  prewriteIdentityBlockers,
} from "../../scripts/lib/import-curation/internal/workflow-identity-preflight.mjs";
import { assert } from "../fixtures/foundry-core.mjs";

// The override authorization flag must surface true ONLY for a profile that declares
// allow_account_local_support_and_elementary.enabled, and false otherwise.
test("normalizeProfile surfaces the account-local override flag per profile", () => {
  const bafu = normalizeProfile(
    { id: "bafu", allow_account_local_support_and_elementary: { enabled: true } },
    "bafu",
  );
  assert.equal(bafu.allowAccountLocalSupportAndElementary, true);
  assert.ok(bafu.accountLocalSupportOverride, "raw override object preserved for audit");

  const generic = normalizeProfile({ id: "generic" }, "generic");
  assert.equal(generic.allowAccountLocalSupportAndElementary, false);
  assert.equal(generic.accountLocalSupportOverride, null);

  const disabled = normalizeProfile(
    { id: "x", allow_account_local_support_and_elementary: { enabled: false } },
    "x",
  );
  assert.equal(disabled.allowAccountLocalSupportAndElementary, false);
});

function elementaryFlowPayload() {
  return {
    flowDataSet: {
      flowInformation: {
        dataSetInformation: {
          "common:UUID": "11111111-1111-4111-8111-111111111111",
          name: { baseName: { "@xml:lang": "en", "#text": "Some substance" } },
          classificationInformation: {
            "common:elementaryFlowCategorization": {
              "common:category": [
                { "@level": "0", "@catId": "1", "#text": "Emissions" },
                { "@level": "1", "@catId": "1.3", "#text": "Emissions to air" },
                {
                  "@level": "2",
                  "@catId": "1.3.4",
                  "#text": "Emissions to air, unspecified",
                },
              ],
            },
          },
        },
      },
      modellingAndValidation: { LCIMethod: { typeOfDataSet: "Elementary flow" } },
    },
  };
}

// Default (flag off): elementary flow writes are blocked reference-only.
test("flowPrewriteIdentityBlockers blocks elementary flow writes by default", () => {
  const blockers = flowPrewriteIdentityBlockers(elementaryFlowPayload(), "flow");
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].code, "elementary_flow_write_blocked");
});

// Override on: elementary flow write is permitted (no prewrite block).
test("flowPrewriteIdentityBlockers permits elementary flow writes under the override", () => {
  const blockers = flowPrewriteIdentityBlockers(elementaryFlowPayload(), "flow", true);
  assert.deepEqual(blockers, []);
});

test("prewriteIdentityBlockers forwards the override flag to the elementary gate", () => {
  const off = prewriteIdentityBlockers(elementaryFlowPayload(), "flow", ".");
  assert.ok(
    off.some((b) => b.code === "elementary_flow_write_blocked"),
    "default keeps the elementary write block",
  );
  const on = prewriteIdentityBlockers(elementaryFlowPayload(), "flow", ".", {
    allowAccountLocalSupportAndElementary: true,
  });
  assert.ok(
    !on.some((b) => b.code === "elementary_flow_write_blocked"),
    "override removes the elementary write block",
  );
});
