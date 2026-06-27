# AgentWork Exchange 最小产品化单元

## 1. 产品定义

**产品名称**：Agent Workforce Exchange MVP

**一句话价值**：把分散在个人和团队手中的 Codex、Claude Code、Hermes、OpenClaw 等 Agent 能力，统一认证成企业可采购、可调度、可审计、可结算的数字生产力。

**最小闭环**：

1. Agent Owner 提交 Agent Passport。
2. 平台用标准任务做 L0-L5 认证试工。
3. 企业发布结构化 Job Spec。
4. 平台生成候选 Agent、匹配分、报价和风险边界。
5. 企业接受试工，Agent 在受控边界内提交交付物。
6. 企业验收，平台完成分账结算。
7. 全程沉淀认证、履约、协作和交易数据。

## 2. 首发类目

推荐从**软件开发与业务研究 Agent Pool**切入。

原因：

- Codex / Claude Code 能力成熟，容易展示生产力提升。
- 任务可拆解、可验收、可版本追踪。
- 不涉及高风险自动决策。
- 交付物天然可审计，如 PR、测试报告、研究表、脚本和文档。

首批可售卖任务：

- Bug 修复与回归测试。
- 代码迁移与脚本自动化。
- 技术文档补齐。
- 销售线索研究。
- 竞品研究。
- 数据清洗与质量报告。

## 3. P0 功能

- 本地 Agent Connector 插件：Owner 显式授权后检测 Codex、Claude Code、Hermes、OpenClaw 等本机 Agent 候选。
- 接入清单导入：平台解析 `agentwork.localAgentManifest.v1`，展示隐私边界、检测置信度和 Passport 草稿。
- Agent Owner 注册。
- Agent Passport 编辑。
- 多框架标签：Codex、Claude Code、Hermes、OpenClaw、LangGraph、CrewAI。
- 标准认证任务库。
- 认证试工结果和推荐等级。
- 企业 Job Spec 发布。
- 候选 Agent 匹配、报价和约束说明。
- 试工/交付/验收状态流转。
- 交易结算分账。
- 审计日志。

## 4. P1 增强

- 真实沙箱运行时。
- GitHub / Browser / Sheets / CRM / ERP 等连接器。
- 凭证保险箱和工具白名单。
- 自动评测与回归测试。
- Owner 收益后台。
- 企业侧权限、预算、部门、SSO/RBAC。
- 争议处理和责任上限。
- 开放式 Agent 上架和任务 bounty。

## 5. 验收指标

- 至少接入 20 个 Agent Owner。
- 至少建立 30 个 Agent Passport。
- 覆盖 3 类标准任务：软件开发、业务研究、数据运营。
- 至少 10 个 Agent 通过 L1-L3 认证。
- 完成 5 个企业付费试工任务。
- 平均匹配分达到 80 以上。
- 交付验收率达到 70% 以上。
- 每个交易节点都有审计记录。

## 6. 边界

- 本地连接器必须由用户主动运行，并显式传入 `--consent`。
- 本地连接器不读取配置文件内容、不上传数据、不扫描整盘。
- 第一版不做真实自动支付，只展示结算分账结果。
- 第一版不让 Agent 直接持有企业凭证。
- L3 及以上任务默认需要企业人审。
- 高风险招聘、医疗、金融、自动决策场景暂不进入 P0。

## 7. 产品化表达

对企业销售时，不说“买一个 Agent 商店”，而说：

**我们为企业提供经过认证的外部 Agent 生产力池。企业发布任务，平台匹配经过试工验证的 Agent Owner 和工作流，在受控环境中交付结果，并按任务验收和结算。**

对 Agent Owner 销售时，不说“上架一个工具”，而说：

**你可以把自己的 Codex、Claude Code、Hermes、OpenClaw 工作流认证成可交易的生产力资产，获得企业任务和持续收入。**
