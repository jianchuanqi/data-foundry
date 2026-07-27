import assert from "node:assert/strict";
import test from "node:test";

import { auditTidasCutover } from "../../scripts/check-tidas-cutover.mjs";

test("active Foundry surfaces contain no retired Python TIDAS invocation paths", () => {
  const report = auditTidasCutover();
  assert.equal(report.status, "passed", JSON.stringify(report.findings, null, 2));
  assert.equal(report.findings.length, 0);
});
