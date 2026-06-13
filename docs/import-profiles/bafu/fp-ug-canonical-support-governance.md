# BAFU FlowProperty / UnitGroup canonical support — governance & unit-scale findings

入口：本文档承接 5 组 non-importable FlowProperty/UnitGroup blocker 的去重治理方案，并记录核查中确认的一个**既存单位尺度问题**。两件事相关但独立。

> agent 长期收尾入口在 **[`bafu-endgame-goal.md`](./bafu-endgame-goal.md)**（goal 模式，含本文档 + 转换器隔间污染 + 747 缺失流 + 重跑闭环的全景）。本文档是其中 FP/UG（workstream C）与单位尺度（workstream D）的详档。

代码侧已落地（本仓库）：

- `scripts/lib/canonical-support-mappings.mjs` — mapping schema 增加 `canonical_reference_unit` + `source_unit_scales`，回填全部既有映射的换算因子（取自 canonical UnitGroup 的 mean_value），并加入 3 条 pending mapping。
- `specs/canonical-support/flow-properties-unit-groups.json` — 同步上述（rewrite 实际读取此缓存，不读 .mjs）。
- `scripts/lib/canonical-support-rewrites.mjs` — rewrite 变 scale-aware：在 rewrite 行与报告中记录 `amount_scale_to_canonical_reference`；当 scale≠1 写入 `canonical-support-amount-scaling.jsonl` 与 `amount_scaling_requirements`；`--block-on-unscaled-canonical-support` 时升级为硬 blocker；pending mapping 产出 `canonical_support_pending_upstream` blocker。
- `test/commands/canonical-support-rewrites.test.mjs` — 覆盖 scale 记录 / 阻断 flag / factor=1 不触发 / pending blocker。

---

## 1. 去重决策（5 源单位 → 3 量纲）

| 源单位 | 引用 flow 数 | 量纲 | canonical 目标 | 参考单位 | 换算因子 |
| --- | --: | --- | --- | --- | --- |
| `my` | 19 | length×time | `Length*time` / `Units of length*time` | `m*a` | 1.0 |
| `kmy` | 13 | length×time | 同上 | `m*a` | **1000** |
| `a` | 87 | time | `Time` / `Units of time` | `a`（year） | 1.0 |
| `hr` | 19 | time | 同上 | `a`（year） | **1/8760 ≈ 1.14155e-4** |
| `personkm` | 169 | person×distance | `Person*distance` / `Units of person*distance` | `personkm` | 1.0 |

核查要点（已逐条验证）：

- `a` = **year/annum**，不是 are（面积）。87 个引用 flow 全是设备/载具运行年（`Use, computer ...`），grep `land|occupation|area|m2` 零命中。⚠️ canonical `Units of area` 里有一个字面单位 `a`=are=100 m²——**绝不能**因符号相同把 `a` 并入 Area。
- `my`/`kmy` 全是线性交通基础设施（`Tram track` / `Railway track on bridge`），同属 length×time。
- `personkm` 全是客运周转，**不是** mass×distance（`kg*km`），零 freight 污染。
- 三个目标量纲在 canonical 缓存中确实缺失（有 Area*time/Volume*time/Mass*time/mass*distance，无 Length*time/Time/Person*distance）。
- 不复用 state_code=0 的 `Unit of working time (LCWE)`：public canonical（state_code=100）视图中根本不可见。

参考单位选择使换算最小化：Length*time 选 `m*a`（仅 13 个 kmy 需换算 < 19 个 my）、Time 选 `a`（仅 19 个 hr 需换算 < 87 个 a）、Person\*distance 单一单位零换算。全局仅 32 个 flow（kmy 13 + hr 19）需要数值换算。

---

## 2. 上游 DB 治理待办（Foundry 不能做）

必须由 canonical 数据库治理（**非 BAFU import 账号**）创建并以 state_code=100 发布：

**Length\*time**：FP `Length*time | 长度*时间`（classification: Technical flow properties）→ UG `Units of length*time | 长度*时间`（Technical unit groups），单位表至少 `m*a`(ref, 1.0)、`km*a`(1000)；建议 alias `my`=`m*a`、`kmy`=`km*a`。

**Time**：FP `Time | 时间` → UG `Units of time | 时间`，参考单位 `a`(=year, **NOT** are=100 m²；在 generalComment 注明)，单位至少 `a`(1.0)、`hr`(1/8760)。落库前确认 year 取 **365 还是 365.25**（仅影响 hr 的 19 个 flow，最坏 0.068% 偏差）。

**Person\*distance**：FP `person*distance | 人*距离`（对齐既有 `mass*distance` 小写风格）→ UG `Unit of personkm`，参考单位 `personkm`(1.0)。

### 激活步骤（DB 行就绪后）

1. 上游建好 3 对 FP/UG 并 publish（state_code=100）。
2. `node scripts/foundry.mjs dataset-support-cache-refresh --out specs/canonical-support/flow-properties-unit-groups.json`（refresh 只拉 state_code=100；现有缓存非空 → 保留现有 `flow_property_mappings`）。
3. 把 3 条 pending mapping 的 `canonical_flow_property_id`（当前 `null`）改成真实 FP UUID，去掉 `pending_canonical_support`，缓存 JSON 与 `.mjs` **双写**保持一致（rewrite 读缓存；refresh-on-empty 回退 .mjs）。校验新 canonical FP 的 `reference_unit_group.id` 也在缓存 `unit_groups` 中（否则触发 `canonical_flow_property_unit_group_unproven`）。
4. 重跑受影响 BAFU flow 的 canonical-support rewrite + resolution；其中 kmy/hr（scale≠1）会被新逻辑标记 `amount_scaling_required`，须按 §3 的换算路径处理数值后再写。

> 在 DB 行存在前，5 个单位保持安全阻断（`canonical_support_pending_upstream` blocker，附参考单位与因子），不会污染数据。

---

## 3. ⚠️ 既存单位尺度问题（独立于上面 5 单位，需决策）

### 结论：这是「文档化政策 vs 实现」的缺口，不是可接受的约定

profile 文档**明确要求**单位换算，且把漏掉换算定性为严重错误：

- `constraints.md:168`：「`kWh` 映射为 Energy，换算到 `MJ` 时系数为 **3.6**」。
- `constraints.md:155`：「`tkm` ... 按 **1000 kg\*km** 处理」。
- `constraints.md:137`：复用公共电力 flow「仍必须核对...**数量单位换算**」。
- `hiq-issue-02:110`：「the amount **must be scaled by 1000** ... **not silent generic adapter magic**. Impact: Missing the scale factor causes a **three-order-of-magnitude error**.」
- `hiq-governance:51`：freight 换算「Apply explicit scaling decision in canonical support mapping, **not silently**.」

但实现里 mapping schema 此前**无 scale 字段**，`canonical-support-rewrites.mjs` 只换 `referenceToFlowPropertyDataSet` 指针、**从不换算数值**（全代码库无任何 exchange amount 换算逻辑）。`kWh→Net calorific value` 的 **FP 名复用**是已接受的 legacy；但**数值不换算**正是文档点名禁止的「silent magic」。

### 端到端实证（canonical 已验证数据）

flow `b84dea0f`（"Electricity, at cogen with biogas engine"，经 process `c908cd1b` 在 canonical 账本 v50 验证）：源 `Amount in kWh` + exchange `0.00344991` → 写入态 flow FP 变 `Net calorific value`(参考 MJ)、meanValue 仍 1、exchange 数值仍 `0.00344991` → 远端存成 `0.00344991 MJ`，物理应为 `0.0124 MJ`（×3.6）。

### canonical-verified 爆炸半径（按 8 个 canonical 账本统计，非 census）

- 受影响参考单位/因子：`kWh→MJ`(×3.6)、`tkm→kg*km`(×1000)、`km→m`(×1000)（参考单位见缓存 UG mean_value）。
- **3,506 个已验证 process / 24,318 条 exchange**（kwh 19,413 + tkm 3,467 + km 1,438）引用了这类 flow 且 amount≠1。
- 此问题与 Task #7「828 隔室零暴露」正交（那是 elementary flow 隔室，不是单位尺度），此前从未清算。

### 回补（pending 决策；本文档不擅自改已验证数据）

1. 用 `--block-on-unscaled-canonical-support` 重跑 canonical-support rewrite，定位全部 `amount_scaling_required` 行（现已可机器产出 `canonical-support-amount-scaling.jsonl`）。
2. 对每条受影响 **process exchange** 的 `meanAmount`/`resultingAmount` 乘 `amount_scale_to_canonical_reference`（kWh ×3.6、tkm/km ×1000），附换算证据；这是跨数据集步骤（flow rewrite 那一 pass 不碰 process 数值）。
3. 重新 readback 校验。
4. 若上游后续提供 generic `Energy` FP（参考单位即 kWh）等「参考单位 = 源单位」的 canonical，则该量纲换算因子归 1，从根上消除此类风险。

> 注意：直接给现有 kWh/tkm/km 映射打开 `--block-on-unscaled-canonical-support` 会在重跑时阻断约 3,000+ 已验证 scope（这正是文档要求的「blocks import: yes」行为），属回补决策的一部分，不要无准备开启。
