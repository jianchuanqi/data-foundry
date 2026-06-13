# BAFU 2025 V2 收尾 Goal（agent 长期工作入口文档）

> 目标读者：接手 BAFU 收尾的任何 agent 会话。读完应能独立判断「现在该做哪条线、下一步具体命令、何时算完成」，无需重新逆向工程。本文是 **goal 模式**文档：state → goals → workstreams → execution rules → completion checks → references。每次推进后更新「§1 当前状态」。
>
> 上游全量导入已闭环（coverage v7：**5,575 verified + 6,172 non-importable = 11,747, gap 0**）。本 goal 处理的是把 6,172 non-importable 逐步解锁、并修正一个已确认的既存数据缺陷，直到全部 11,747 是 _verified_ 或 _有据维持 non-importable_。

工作根目录：`tiangong-lca-data-foundry`。`RUN=.foundry/workspaces/bafu-full-import-20260607T080646Z`（下文 `$RUN` 指它）。所有命令从仓库根跑。

---

## 1. 当前状态（2026-06-13）

- **coverage v7 终版**：`$RUN/universe-coverage-v7-final/` = 5,575 verified + 6,172 non-importable，human-review/retry/pending 全 0，npm test + doctor 通过。
- **6,172 non-importable 去重后 = 747 缺失 elementary flow + 5 对 FP/UG**（详 §3-B/C）。
- 评审包就绪：`$RUN/non-importable-review-v1/`（README + index.html + missing-dependencies-report.md/.xlsx + 富化 CSV/JSON）。
- FP/UG 代码侧已落地：mapping schema 加 scale、rewrite scale-aware、3 条 pending mapping（详 `fp-ug-canonical-support-governance.md`）。
- **两个已确认、需上游/决策的根因问题**：转换器隔间污染（§2-A）、单位尺度缺陷（§2-B）。

---

## 2. 已确认的根因发现（写入治理记录）

### A. 转换器隔间污染：所有 elementary flow 被写成「Emissions to air, unspecified」

**症状**：BAFU→TIDAS（ecoSpold1 转换）输出的 `classificationInformation.common:elementaryFlowCategorization` 对**所有** elementary flow 一律写 `Emissions > Emissions to air > Emissions to air, unspecified`，无论该 flow 实际是 resource / water / soil / land use。

**根因**：转换器硬编码默认分类 —— `tidas-tools` 的 `src/tidas_tools/import_lca/writers/tidas_json.py` 的 `_flow_classification()`（约 line 1568）对 Elementary flow 直接写 air-unspecified。（tidas-tools 在另一台机器，foundry 仓库内不可直接读；以下以数据症状为准。）

**实证（已在 foundry 输入逐字核对）**：

- Peat `bdd07621-508b-5d4a-974d-54c72ba141a5`：写出 category = `Emissions to air, unspecified`，但 `flowDataSet.flowInformation.dataSetInformation.common:other.tidasimport:sourceTrace.payload.sourceClassification` = `{category: resources, subCategory: biotic, inputGroup: 4}`，源 ecoSpold exchange 本身 `category=resources`。Peat（泥炭，半分解植物残体，燃料/资源流）正确映射应是 `Peat, in ground → Resources from biosphere`，而非 air emission。
- Peat `766f2900...` 同样：写 air emission，sourceTrace = resources / in ground / inputGroup 4。

**权威字段**：判断 elementary flow 真实隔间，**必须**读 `…dataSetInformation.common:other.tidasimport:sourceTrace.payload.sourceClassification`，**不要**用被污染的 `classificationInformation.common:elementaryFlowCategorization`。注意同一 JSON 里 `classificationInformation` 下还有一个只含 `sourceFlowType` 的 sourceTrace —— 别用错，真分类在 `dataSetInformation` 一级的那个。

**现状（已缓解）**：foundry 的 elementary identity 评估器（`scripts/commands/library-scope-workflow.mjs`）与本轮的缺失流报告**都已改用 sourceTrace 隔间**（含 ecoinvent→ILCD 子隔间映射、CAS 前导零归一）。所以 §3-B 的 747 缺失流报告里隔间是**真分类**（如 Peat 已正确标 biotic/resource、远端候选 `Peat, in ground`）。

- 待办（上游）：在 tidas-tools 修 `_flow_classification()`，让转换从 sourceClassification 直接写对隔间，从源头消除污染（避免每个下游各自打补丁）。属上游代码治理，foundry 仓库不能改。
- 待办（forensic）：已验证的 elementary flow reuse 决策是否有因早期未用 sourceTrace 而错配的？历史已审：Task #7 证实 828 条早期错隔间映射与任何 verified scope 交集为零（修复早于写入）。新一轮 reuse（decisions-v11/v12）均基于 sourceTrace，无需复查。

### B. 单位尺度缺陷：canonical support rewrite 不换算数值

**结论**：profile 文档明确要求 kWh→MJ ×3.6、tkm→kg\*km ×1000 的换算且禁止「silent」，但实现只换 FP 指针、从不换算 exchange 数值 → **3,506 个已验证 process / 24,318 条 exchange** 在严格 ILCD 下带 ×3.6~×1000 误差。详见 `fp-ug-canonical-support-governance.md` §3。代码侧已加 scale 感知 + `--block-on-unscaled-canonical-support` + pending blocker；回补存量为 pending 决策。

---

## 3. Workstreams（各线的状态 / 下一步 / 负责方 / 阻塞）

> 负责方：**[code]** foundry 代码（agent 可做）；**[authoring]** AI authoring 轮（agent 可做）；**[expert]** LCA 领域专家判定；**[upstream]** 数据库/转换器治理（agent 不能做）。

### A. elementary 隔间权威化 —— [code] 已完成 / [upstream] 转换器待修

- 已完成：评估器与报告改用 sourceTrace。
- 待上游：tidas-tools `_flow_classification()` 从源头修隔间。完成后重转 + 复核不再有污染默认。

### B. 747 缺失 elementary flow —— [expert] 判定 → [authoring] 落决策 → [code] 重跑

- 评审单元（非逐 scope）：评审包 `$RUN/non-importable-review-v1/`。三档：91 疑似 remap（42 方向合理 + 49 须核对）/ 344 有近似待判 / 312 无近似。
- 下一步：专家在 index.html 或 CSV 填 verdict（upstream_add / remap_existing+目标流 / keep_non_importable / unsure）→ 导出 → 转 identity decisions（仿 decisions-v12 的 sha-bundle + 校验器流程）→ 写入新决策目录 `decisions-v13-*`。
- 优先级（curve 实测）：前 5 流解锁 1,049、前 50 解锁 2,550、前 100 解锁 3,211。Top1 NMVOC(low.pop) 压 1,694。13 个 authoring 轮拒绝项证据最全，宜首批校准。

### C. 5 对 FP/UG canonical support —— [upstream] 建库 → [code] 激活

- 去重 5→3 维度（length*time / time / person*distance）+ 参考单位 + 因子已定，3 条 pending mapping 已就位（null UUID，安全阻断为 `canonical_support_pending_upstream`）。
- 待上游：建 3 对 canonical FP/UG（state_code=100），激活步骤见 `fp-ug-canonical-support-governance.md` §2。

### D. kWh/tkm/km 单位尺度回补 —— [decision] → [code]

- 待决策：是否回补存量（详 §2-B / governance §3）。回补脚本属 [code] 可做，但触及已验证数据，需用户拍板。

### E. 重跑闭环 —— [code]，每轮收尾

- 模式：新决策（decisions-v13）→ resolution（v16）→ 新批次（v53，沿用 v52 脚本模板、新 out-dir、ledger sources 追加 v52）→ coverage v8 → 从 `non-importable-scopes-v1.jsonl` 移除已解锁行、重生成评审包。
- 每轮用 coverage 报告量进度（§5）。

---

## 4. Execution Rules（违反任一 = 返工）

1. **Canonical ledger sources**（新批次全部显式携带）：v35 / v41 / v42 / v45 / v49 / v50 / v51 / v52 的 `import-ledger`。v12/v46/v47/v48 仅 forensic。
2. **commit 必带** `--target-user-id dab05739-1a42-421b-8170-3b77146d1d64`（溯源 `$RUN/account-write-guard.json`）。
3. **candidate ≠ authoritative**：classification/location/identity/authoring 的 AI 输出必须带 sha bundle 证据并经 deterministic apply/projection；规则推导只是 candidate。
4. **elementary flow 隔间判断用 sourceTrace.payload.sourceClassification，不用被污染的 elementaryFlowCategorization**（§2-A）。
5. **FP/UG / elementary flow 不得新建 BAFU 私有 support**：缺则阻塞并形成上游 canonical 待办；rewrite 的 `canonical_*_unproven` / `canonical_support_pending_upstream` blocker 即门禁。
6. **canonical support 换算落点**：scale 因子放 mapping 的 `source_unit_scales`（rewrite 读 cache JSON，不读 .mjs，两边双写保持一致）；数值换算落 process exchange 层，不是逐 flow 改 meanValue，也不在 rewrite pass。
7. **--pending-only 会跳过源 ledger 中 blocked-active 的 scope**：跨批次残余须显式 `--process-id-file` sweep。
8. 每个新批次独立 out-dir / report / run-manifest / ledger；coverage 显式列 ledger sources；恢复批次前 rm pause flag + pgrep 旧进程 + 以 run-manifest 恢复参数。
9. 长驻 runner 启动时加载代码：提交修复后须 pause→relaunch 换代，否则同类 blocked 持续累积。

---

## 5. 进度度量 & Completion Checks

度量：跑 coverage 报告（命令见 `bafu-import-runbook.md` §5.4，ledger sources 追加最新批次 + `--non-importable-scopes-file`）。

完成（全部满足）：

- `process-bundles/index.json` unique = 11,747 = `tidas/processes` unique。
- 11,747 全部 verified 或登记 non-importable；coverage `process_coverage_gap_rows = 0`、`active_human_review/retry/pending = 0`。
- 单位尺度缺陷（§2-B）已回补或经用户明确接受并记录。
- 5 对 FP/UG 已激活（canonical 行就绪）或经确认上游阻塞、维持登记。
- 747 缺失流全部有专家 verdict：解锁的进 verified，维持的在登记文件有据。
- npm test + npm run doctor 通过；保存最终 batch report / canonical ledger / coverage / 评审包路径。

---

## 6. References

- 评审包：`$RUN/non-importable-review-v1/`（README.md 手册、index.html 仪表盘、missing-dependencies-report.md/.xlsx、data/）。
- FP/UG + 单位尺度治理详档：`docs/import-profiles/bafu/fp-ug-canonical-support-governance.md`。
- 运行手册（命令模板/分诊表/恢复清单）：`docs/bafu-import-runbook.md`。
- Profile 约束（含单位/隔间口径）：`docs/import-profiles/bafu/constraints.md`。
- 登记文件：`$RUN/non-importable-scopes-v1.jsonl` + `.report.json`（依赖列表截断于 40，完整以 ledger / scopes.csv 为准）。
- 记忆：`bafu-v50-import-phase.md`（隔间修复、合同链、单位尺度发现等沿革）。
