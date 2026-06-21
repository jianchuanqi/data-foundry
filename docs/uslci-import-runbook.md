# USLCI 导入运行手册（goal 入口文档）

> 目标读者：接手 USLCI 持续导入的任何一个 agent 会话或人工操作者。读完本文应能：知道当前阶段在哪、用哪条命令继续、遇到 blocker 怎么分诊，而不需要重新逆向工程。最后更新：2026-06-12（**Phase 1+2 完成**：正式转换链建立 + 单位归一化硬门禁关闭 + FP/UG 决策回合落地；详见 §6）。更新本文时同步更新「§6 当前状态快照」。

---

## 0. 三十秒定位

- **Goal**：把 `inputs/National_Renewable_Energy_Laboratory-USLCI_Database_Public` 的 **1,358** 个 process（1,341 USLCI + 17 个被传递引用的 library 电网过程）导入远端 TIDAS 库，每个 process 最终为 _verified_ 或 _明确 non-importable_，gap 0（口径与 BAFU coverage 闭环一致）。
- **Profile**：`uslci`（`specs/import-profiles.json`；约束见 `docs/import-profiles/uslci/`）。Lane：`external-dataset-curated-import`，**禁止新增 USLCI 专用 Foundry 代码路径，直到 pilot 证明必要**。
- **任务文件**：`tasks/active/external-import-20260612-uslci.md`（已 claim，state Doing；队列内容是本地运行态，不入 git）。
- **源包事实与 sha256**：`inputs/source-packages/uslci-database-public.md`（这是 source manifest，所有计数和复现命令在那里，本文不重复）。
- **工作区**：`RUN=.foundry/workspaces/uslci-full-import-<UTC时间戳>`（Phase 1 创建后回填到 §6；下文 `$RUN` 指它）。阶段日志：`$RUN/phase-journal.md`。
- **所有命令从仓库根目录跑**（`tiangong-lca-data-foundry/`）。

```bash
cd /Users/davidli/projects/workspace/tiangong-lca-data-foundry
# Phase 1 起：export RUN=.foundry/workspaces/uslci-full-import-<ts>
```

---

## 1. 三条原则（本 goal 的宪法，违反 = 返工）

1. **不影响平行功能**。
   - 绝不读写 BAFU 的运行态：`$RUN_BAFU=.foundry/workspaces/bafu-full-import-20260607T080646Z` 及其全部 decisions/ledger/resolution 目录只许 forensic 参考，不许修改。BAFU 后续 unlock 回合（decisions-v13 路径）可能与本 goal 并行。
   - 不改变任何 `dataset-bafu-*` 命令的行为；共享代码（`scripts/lib`、`scripts/commands/` 中 profile 无关部分）的改动必须 dataset-agnostic 且 `npm test` 全绿 + `node scripts/foundry.mjs doctor` 通过后才能落地。
   - 共享资源注意：`specs/canonical-support/flow-properties-unit-groups.json` 是跨 profile 公共缓存，`dataset-support-cache-refresh` 是增量安全的，但刷新后要确认 BAFU 既有映射未被删改。
   - 单独数据集制备（`source-evidence-dataset-development` lane）与本 goal 无共享运行态，互不阻塞。
2. **充分共用既有代码与设施**。
   - 格式转换 owner 是 tidas-tools（`openlca-jsonld` adapter）+ tiangong-lca-cli 包装，Foundry 只编排（`docs/capability-ownership-policy.md`、`specs/workspace-capability-adapters.md` 的 `external-lca-package-conversion`）。转换器缺陷修在 tidas-tools，不在 Foundry 打补丁。
   - 编排走 generic 命令链（§4），决策机制完全复用 BAFU 打磨出的 sha256 绑定 task bundle + deterministic apply 体系。
3. **导入过程中持续迭代完善本项目**。
   - 每轮批次暴露的通用缺陷按归属修复：Foundry 编排层 → 本仓库 generic 层（带测试）；转换/校验 → tidas-tools（capability-development-request 任务，模板在 `tasks/templates/`）；CLI 包装 → tiangong-lca-cli。
   - pilot 之后预期的两个 Foundry 演进项（届时按 P1 提）：把 `dataset-bafu-batch-import-run` 参数化为 profile 驱动的通用批量 runner；把 `dataset-bafu-universe-coverage-report` 推广为 profile 无关的 coverage 报告。
   - 每个会话结束前：回写 §6 快照 + `$RUN/phase-journal.md`；修复以主题 commit 落 foundry main。

## 2. 不变式（继承 BAFU 经验，从第一天就执行）

1. **canonical ledger sources**：成功证据只认 §6 列出的 ledger 目录；coverage 统计用 `dataset-import-ledger-report --ledger-dir` 逐目录汇总并显式列出来源（注意：`--ledger-source-dir` 这个 flag 只存在于 BAFU 专用 runner，generic 链没有，等 §1-3 的通用化演进后才可用）。candidate ≠ authoritative：AI 输出必须带 `authoring_context.context_bundle_sha256` 证据并经 deterministic apply 进库。
2. 每个新批次独立 `--out-dir`、独立 report / run-manifest / ledger。
3. 所有支持 `--profile` 的命令**显式传 `--profile uslci`**；所有 decisions/resolution 路径显式传参——`dataset-bafu-batch-import-run` 一类命令的默认值指向 BAFU 工件，绝不能依赖默认。
4. **远端写入是人工门禁**：任务 frontmatter `allow_remote_commit: false`；翻转它需要用户明确批准账号/写入政策（§5 D4）。在那之前一切到 dry-run / queue verify 为止。
5. **单位归一化硬门禁**：✅ 已满足（2026-06-12 关闭，tidas-tools a3e1aa9 + 独立校验器全对，见 §7-2）。规则保留：若未来重新转换（新 tidas-tools 版本/源包变更），必须重跑 `$RUN/unit-normalization-verify/verify.py` 全对后才可恢复 commit。
6. 高并行跑 CLI 时 `npm install --no-save @tiangong-lca/cli@latest && export TIANGONG_LCA_CLI_BIN=$PWD/node_modules/.bin/tiangong-lca`（npx 并发风暴会假性 blocked；BAFU 实测教训）。
7. 源包目录（含 `libraries/`）是冻结输入：任何变更必须同步更新 `inputs/source-packages/uslci-database-public.md` 的 sha256/日期。

## 3. 目录地图

| 路径 | 是什么 |
| --- | --- |
| `inputs/National_Renewable_Energy_Laboratory-USLCI_Database_Public/` | 冻结源包（openLCA JSON-LD v2）+ `libraries/` 补充数据（见 source manifest） |
| `inputs/source-packages/uslci-database-public.md` | source manifest：计数、sha256、闭合验证事实、复现命令 |
| `docs/import-profiles/uslci/` | profile.md（政策与 open decisions）、constraints.md（gate 约束） |
| `$RUN/conversion-vN/` | tidas-tools 转换输出（tidas/ + process-bundles/ + conversion-report.json），Phase 1 产生 |
| `$RUN/library-index/` | `dataset-library-index-build` 输出（entity index + scope projection） |
| `$RUN/decisions-vN-*/` | identity / classification / location / canonical-support 决策 JSONL（sha 绑定 bundle 证据同目录） |
| `$RUN/library-resolution-vN/` | `dataset-library-decisions-apply` 输出：ready-scopes + blocked-scope-ledger |
| `$RUN/batch-import-vN-*/` | 批次工作台与 import-ledger |
| `$RUN/phase-journal.md` | 阶段日志（每会话追加） |

## 4. 流水线总览

```
inputs(合并源包) → tidas-tools 转换（CLI 包装入口，见 §5 Phase 1）
  → dataset-library-index-build      ($RUN/library-index)
  → [决策回合] identity-preflight / classification / location / canonical-support  ($RUN/decisions-vN)
  → dataset-library-decisions-apply  ($RUN/library-resolution-vN)
  → generic 提交链（per scope）：tiangong-lca dataset curation-queue build/next/verify
      + dataset-curation-gate / dataset-curation-cleanup
      + dataset-post-authoring-finalize → dataset-mutation-manifest
      → dataset-commit-handoff-plan → remote write → readback → dataset-post-write-closeout
      （批量执行器：dataset-process-scope-run；不要用 dataset-bafu-batch-import-run）
  → dataset-import-ledger-report / coverage 统计 → 回写 §6
```

命令清单：`node scripts/foundry.mjs --help`；逐命令参数 `node scripts/foundry.mjs <cmd> --help`。决策回合的方法论直接参照 `docs/bafu-import-runbook.md` §4（机制完全相同，只是 profile/路径换成 uslci）。

## 5. 阶段计划

### Phase 0 — 补充数据与可转换性验证 ✅（2026-06-12 本会话完成）

- library zip 下载冻结 + meta 解压进 `libraries/`；UUID 零冲突、引用闭合 0 缺失、传递 provider 闭包 = 17 个 library 过程——全部验证通过（证据与命令：source manifest）。
- 合并包根目录全量冒烟转换（tidas-tools 0.0.29 checkout）：0 错误、TIDAS 校验 0 issue、2,112 bundles、`unresolved_references` 0。CLI 包装入口（@tiangong-lca/cli 0.0.16）端到端验证通过。输出在 /tmp（一次性，Phase 1 正式重跑进 $RUN）。

### Phase 1 — 入场与正式转换

1. claim 任务（inbox → active），`mkdir -p .foundry/workspaces/uslci-full-import-<ts>`，回填 §6 的 $RUN，开 phase-journal。
2. 正式转换（文档入口，@tiangong-lca/cli ≥0.0.16；注意包装裸调 `python3`，必须 `--python` 指向带 tidas-tools 依赖的解释器）：
   ```bash
   npm install --no-save @tiangong-lca/cli@latest
   ./node_modules/.bin/tiangong-lca dataset import-lca convert \
     --input "inputs/National_Renewable_Energy_Laboratory-USLCI_Database_Public" \
     --output-dir "$RUN/conversion-v1" \
     --from-format openlca-jsonld --target tidas --validation-jobs 0 \
     --python /Users/davidli/projects/workspace/tidas-tools/.venv/bin/python \
     --tidas-tools-dir /Users/davidli/projects/workspace/tidas-tools --json
   ```
   备选（包装不可用时等价）：`cd tidas-tools && PYTHONPATH=src .venv/bin/python -m tidas_tools.import_lca.cli --input … --output-dir … --from-format openlca-jsonld --target tidas --validation-jobs 0`。预期 ≈2-4 分钟、1.9 GB。出场标准：conversion-report 0 error；TIDAS validation ok；bundle index `unresolved_references == 0`；数字与 source manifest 冒烟一致。
3. `dataset-library-index-build` 指向 `$RUN/conversion-v1/process-bundles` 建库存索引。
4. **范围决策 D1（默认推荐已给）**：universe = 1,341 USLCI + 17 provider 过程 = 1,358；其余 754 个 library 过程不在本 goal 范围（未来可另立 goal）。在 phase-journal 记录 universe 清单文件。

### Phase 2 — 转换器缺陷修复（与 Phase 3 并行推进，但卡死 commit）

- **单位归一化**（§7-2，本 goal 最大数值风险，目前唯一的 commit 硬门禁）：在 tidas-tools 转换层实现 exchange 单位 → flow 参考单位换算（同属性 7,905 条走 unit group 因子；跨属性如 m³→kg 1,009 条走 flow 级 flowProperties 因子，合并包内全部可得、0 缺失）。按 capability-development-request 流程提给 tidas-tools，验收：重转换 conversion-v2 后，确定性扫描「exchange 源单位 ≠ flow 参考单位的 9,489 条」全部 meanAmount 已正确换算（写一个独立校验脚本，模式参照 BAFU 的 tmp/validate-\*.py）。

### Phase 3 — 决策回合（机制同 BAFU runbook §4）

1. **identity preflight**（elementary flows，最大未知数）：`dataset-identity-preflight-requests-build → -run → dataset-library-identity-decisions-from-preflight`。USLCI 是 FEDEFL UUID/隔间体系，与 TianGong canonical 的匹配率未知，首轮 preflight 的产出就是这个数。注意 openlca-jsonld 转换的 sourceTrace 形状与 BAFU（ecoSpold）不同——evaluator 的 trace 隔间恢复逻辑（`scripts/commands/library-scope-workflow.mjs`）若需适配，按 generic 改法加测试。FEDEFL 隔间路径 → ILCD 隔间映射表作为决策证据沉淀在 decisions 目录。政策红线：elementary flow 只许 reuse_existing_reference，绝不 create_new。
2. **classification**：NAICS 类目路径 → TianGong 分类决策（`dataset-classification-decision-task-build` + sha 绑定 bundle + `dataset-classification-decisions-apply`）。
3. **canonical FP/UG 映射**：`dataset-support-cache-refresh` + `dataset-canonical-support-mappings-autofill`。15 个标准 ILCD-UUID FP 预期可直接映射；6 个本地特殊 FP（Taxes/Jobs/Wages/Producer price 等）+ Currencies UG 大概率无 canonical 对应 → 提 non-importable 政策决议（D3 的一部分）。
4. **location**：`dataset-location-decisions-suggest/-apply`（399 个 location 实体只用于代码解析；重点核对 US 州级代码在 TIDAS location schema 下合法）。
5. **双语治理**：USLCI 是纯英文源；TIDAS 语言治理（本仓库 commit 62b7630）要求 zh/en。决定 zh transcreation 的批量路径（`tiangong-lca-skills/tidas-bilingual-transcreation`）与 gate 时点，记入 profile.md。
6. `dataset-library-decisions-apply` → resolution-v1：ready / blocked 第一次分票，blocked ledger 驱动下一轮决策（回合制同 BAFU）。

### Phase 4 — Pilot 批次（首个 commit 前的人工门禁集中点）

1. 选 20-50 个「干净」process（无 allocation、无 amountFormula、无单位不一致、不依赖 17 个 library provider），走完整 generic 链到 dry-run + queue verify。
2. 凭 pilot 证据集中关闭 profile open decisions：**D2** source 引用政策（NREL 署名 contact/database 级 fallback source；bin/ 8 个附件的取舍）；**D3** QA warning-vs-blocker 清单（LCI_RESULT 25 个、allocationFactors 61 个、amountFormula 1,425 条、无 canonical 对应的 FP 等）；**D4** 账号/state-code/写入政策（**需用户批准**，之后才翻 `allow_remote_commit: true`）。
3. 决议落地：更新 `docs/import-profiles/uslci/profile.md`、`constraints.md`、`specs/import-profiles.json`（waivers / full_context_ai_completion 按证据填）。
4. 首批 commit + readback verify + closeout，建立第一个 canonical ledger source，登记到 §6。

### Phase 5 — 批量推进与闭环

- 回合制推进：缺口分析 → 决策回合 vN → resolution vN → 批次 vN（独立 out-dir，显式 ledger sources）→ `dataset-import-ledger-report` → 回写 §6。
- 批量执行用 `dataset-process-scope-run`；若吞吐不足，按 §1-3 的演进项把 BAFU runner 参数化（届时是 generic 改造 + 全测试，不是 USLCI 专用路径）。
- 收尾口径：verified + 明确 non-importable（带逐项证据的 registration 文件，参照 BAFU `non-importable-scopes-v1.jsonl` 模式）= 1,358，gap 0；coverage 终版快照写进本文件，goal 关闭，`npm run task:complete` 归档任务。

## 6. 当前状态快照（每会话结束前更新）

- **阶段**：Phase 1+2 完成；Phase 3 决策回合推进中——identity 主体完成、FP/UG 完成，**classification 是下一大回合**（2026-06-13）。
- **$RUN**：`.foundry/workspaces/uslci-full-import-20260612T093202Z`（task：external-import-20260612-uslci 已 claim；阶段日志 `$RUN/phase-journal.md` 有 NEXT SESSION ENTRY POINT 一节）。
- **canonical 转换链**：`conversion-v2`（tidas-tools a3e1aa9 含单位归一化；9,478 处修正 / unresolved 0 / 校验 0 错误）+ `library-index-v2` + `library-resolution-v3`。独立校验器 78,757/78,757 全对（`$RUN/unit-normalization-verify/verify-report.json`）。v1 工件仅留 forensic。
- **universe**：1,358 已确认（`$RUN/universe-v1/`；排除 754 个未被引用的 library 过程）。
- **canonical 决策链**：`conversion-v2` + `library-index-v2` + `decisions-v3`（超集：canonical-support 20 + identity 2,988）+ `library-resolution-v4` + `identity-from-preflight-v3`。
- **identity ✅ 主体完成**（evaluator openLCA-compartment 修复，foundry commit 9136031）：reuse **2,988 / 3,919**，独立交叉验证 0 隔间错配、0 错物质（唯一 CAS"冲突"是 Krypton 源校验位打错）。剩 931 进 manual authoring 尾巴（no_candidate 698 多为真实非可导入/近缘物，multiple_plausible 220 可 AI 授权）。
- **FP/UG**：decisions-v2-support；7 FP + 4 UG 无 canonical（139 scopes，D3 证据）。
- **resolution-v4 缺口（按体量）**：process_classification 2,112 + flow_classification 1,638（**现在是 THE blocker，下一大回合**，先研究 task-build sha-bundle 合同）；elementary identity 残余 931 deps / 986 scopes；FP/UG 139 scopes。blocked-ledger 行 73,127→22,652，已生成 54,788 条 exchange 引用重写。ready 仍 0（classification 卡全部）。
- **远端缺陷已闭环**：flow_hybrid_search pgroonga 特殊字符 500 由用户修复发布，7 个失败 flow 已重跑成功。
- **canonical ledger sources**：无（首个在 Phase 4 产生）。
- **已知阻塞**：无技术硬门禁；剩决策回合体量 + Phase 4 的 D2-D4 人工批准。
- **测试基线**：foundry `npm test` 186/186 + doctor 通过；tidas-tools 89/89（2026-06-12）。

## 7. 已知问题与 blocker 分诊

| # | 问题 | 影响 | 处置 |
| --- | --- | --- | --- |
| 1 | ~~tiangong-lca-cli ≤0.0.14 向 tidas-tools ≥0.0.28 传已移除的 `--process-bundles` flag，文档入口直接失败~~ **已解决**：cli 0.0.16（commit 98104c9，2026-06-11）已适配，2026-06-12 端到端验证通过 | 无（历史） | 留意两点：包装默认裸调 `python3`，要传 `--python <venv解释器>`；`npm install --no-save @tiangong-lca/cli@latest` 保持 ≥0.0.16 |
| 2 | ~~转换器不做单位换算，数值错最高 1000×~~ **已解决**：tidas-tools a3e1aa9（2026-06-12）在 openlca adapter 加归一化 pass；conversion-v2 修正 9,478 条（unresolved 0），独立校验器 78,757/78,757 全对 | 无（历史） | 留意：474 条 amountFormula 公式本身未重缩放（仅存 trace，QA 在 pilot 定性）；84 条 ref_unit_name_mismatch 为源数据 refUnit 文本怪癖，数值已验证正确 |
| 3 | FEDEFL elementary flow 对 TianGong canonical 匹配率未知 | 决定 blocked 规模（2,682 本地 + 2,190 library elementary；library flows 共 2,310） | Phase 3 首轮 preflight 量化；CAS/分子式在 library flow 里可用作匹配证据 |
| 4 | dq_systems / pedigree 只进 sourceTrace（881 个 process 的 dqEntry + per-exchange pedigree 不映射 TIDAS 数据质量字段） | 数据质量信息暂 trace-only | Phase 3 决策：tidas-tools 增强 或 接受 trace-only（capability-development-request） |
| 5 | bin/ 8 个 source 附件（PDF/JPG）转换时丢弃 | 来源证据不全 | D2 一并定（附件→TIDAS digital file 或 trace 记录） |
| 6 | 25 个 LCI_RESULT、61 个 allocationFactors、1,425 条 amountFormula 仅存 trace | QA 定性未定 | pilot 时定 warning vs blocker（D3） |
| 7 | 纯英文源 vs TIDAS zh/en 双语治理 | curation gate 可能 block | Phase 3-5 定 transcreation 批量路径 |
| 8 | 12 个 currency、399 个 location 实体、categories.json 不转换为 TIDAS 实体 | 无（currency 零引用；location 仅供代码解析；类目以各实体 `category` 字段为准） | 已定性，无需处理 |

## 8. 与 BAFU 的差异速查

| 维度 | BAFU | USLCI |
| --- | --- | --- |
| 源格式 | ecoSpold1 →（预转换）TIDAS 入库 inputs | openLCA JSON-LD 原始包入库 inputs，转换在 Phase 1 现场跑 |
| 引用闭合 | 包内自洽 | 依赖外部 library（已合并冻结，Phase 0 闭合） |
| 单位 | 天然同单位 | 12.2% exchange 需换算（§7-2） |
| 名称形态 | 德文压缩名，需大量 name-split 规则 | 分号结构化英文名，预期无 name-split 回合 |
| 支持数据 | 合成 contact/source 居多 | 70 真实 actor + 557 真实 source，质量更好 |
| elementary 体系 | ecoinvent 隔间（trace 恢复） | FEDEFL UUID/隔间（映射表待建） |
| 批量 runner | dataset-bafu-batch-import-run | generic 链 + dataset-process-scope-run（pilot 后再议通用化） |
