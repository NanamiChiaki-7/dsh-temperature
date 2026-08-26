<div align="center">

# dsh-temperature · 参数设置 / Parameter Settings

为 DeepSeek Harness 提供 LLM 采样参数控制 —— 全局默认 + 每会话覆盖、对话上方滑块条、按 API 的参数支持、以及 DeepSeek 思考模式。

LLM sampling controls for DeepSeek Harness — global defaults and per-session overrides, an above-the-chat slider strip, per-provider parameter support, and DeepSeek thinking mode.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-web-green)
![Built for](https://img.shields.io/badge/built%20for-DeepSeek%20Harness-4c8bf5)

</div>

---

# 中文版

## ✨ 功能

- **全局默认 + 每会话覆盖** —— 为 `temperature`、`top_p`、`max_tokens` 以及 DeepSeek **思考模式** 设置默认值；也可为某个会话单独覆盖。
- **对话上方条** —— 输入框上方一条居中的、类似"任务/目标"bar 的控件，用 **滑块 + 数字** 快速调整*当前*会话的参数。
- **按 API 的支持表** —— 每个 API 各不相同：告诉插件各提供方/模型实际支持哪些参数，**不支持的参数不会被发送**，避免参数导致调用报错。
- **自解释** —— 不清楚自己的 API 支持哪些参数？复制内置提示词发给 agent，它会去读你的接口文档并帮你修改本地设置文件。
- **配置走文件** —— 所有配置都在 `~/.dsh/settings.yaml`，可在 GUI 里改，也可直接手改。

## 🚀 安装

把它作为 bundle 加入你的 `web` profile：

```sh
cd ~/.dsh/profiles/web
dsh plugin add https://github.com/NanamiChiaki-7/dsh-temperature
```

或手动放入 `node_modules` 并在 `cordis.patch.yml` 加一行：

```yaml
- insert:
    - id: temperature
      name: dsh-temperature
```

重启 `dsh web`，然后打开 **设置 → 参数设置**。

## 🛠️ 参数

| 参数名             | 取值范围 / 选项                 | 说明                                                    |
| ----------------- | ------------------------------- | ------------------------------------------------------- |
| `temperature`     | `0 – 2`（0.01）                 | 全局默认 `1.0`；默认在对话上方显示。                    |
| `top_p`           | `0 – 1`（0.01）                 | 默认不在对话上方显示。                                  |
| `maxTokens`       | 整数；`<= 0` = 不限        | 用一个**切换按钮**开关限制：关闭（不限）时不发送，用提供方默认；开启后输入正整数（需在模型有效范围内，如 DeepSeek `[1, 393216]`）。默认关闭。 |
| `reasoningEffort` | `default · off · low · medium · high · max` | DeepSeek 思考模式。`default`=不干预 Harness 自带的推理强度；`off`=关闭思考；`low`–`max`=设置推理强度。 |

思考模式通过 `LlmCallConfig.reasoningEffort` 生效，由 DeepSeek 适配器映射到请求体里的 `thinking` / `reasoning_effort`。

## 🗂️ 按 API 的参数支持

`providerSupport` 表存储在 **`~/.dsh/settings.yaml` → `parameters.providerSupport.<provider>.<param>`**。**未勾选的参数不会被发送**，因此不会导致接口报错。

| 提供方（route）    | temperature | top_p | maxTokens | reasoning |
| ------------------ | ----------- | ----- | --------- | --------- |
| `deepseek(-official)` | ✓        | ✓     | ✓         | ✓         |
| `openai`           | ✓           | ✓     | ✓         | ✓         |
| `anthropic`        | ✓           | ✗     | ✓         | ✓         |
| `gemini` / `google`| ✓           | ✓     | ✓         | ✓         |
| `moonshot` / `zhipu` / `qwen` | ✓ | ✓     | ✓         | ✓         |
| *你的自定义 route* | *由你决定*  | *由你决定* | *由你决定* | *由你决定* |

**已知注意事项**（请以你自己的 API 文档为准）：
- **推理模型**（OpenAI `o1`/`o3`/`gpt-5` 思考模式、DeepSeek `R1` 等）通常**不接受或忽略 `temperature` / `top_p`** —— 请为这类模型关闭它们。
- **Anthropic Claude** 不支持 `top_p`。

不确定你的 API 支持哪些？打开 **参数设置**，点 **复制 / Copy**，把提示词发给 agent —— 它会查你的接口文档并自己改设置文件。

## 📚 参考文档

- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)
- [DeepSeek 思考模式](https://api-docs.deepseek.com/guides/thinking_mode)
- [Anthropic Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [OpenAI 推理模型采样限制](https://github.com/danny-avila/LibreChat/issues/10737)
- [Vertex AI 模型参数](https://firebase.google.cn/docs/vertex-ai/model-parameters)

## 📦 目录结构

```
plugins/dsh-temperature/
├── lib/
│   ├── index.js     # host 端（设置命名空间 + agent/request 注入）
│   └── client.js    # 浏览器端（设置页 + 对话上方条）
├── src/index.ts     # 规范的带类型 host 源码
├── cordis.patch.yml # 挂载 host 行的 bundle patch
└── package.json     # dsh.client 清单 + ./client 导出
```

## ⚖️ 许可证

MIT

---

# English

## ✨ Features

- **Global defaults + per-session overrides** — set a default for `temperature`, `top_p`, `max_tokens` and DeepSeek's **thinking mode**; override any of them for an individual session.
- **Above-the-chat strip** — a centered, tasks/goals-style bar right above the input lets you tweak the *current* session's parameters on the fly with a **slider + number** control.
- **Per-provider support table** — every API is different: tell the plugin which parameters each provider/model actually accepts, and unsupported ones are **never sent**, so a bad parameter can't break an API call.
- **Self-documenting** — if you don't know what your API supports, copy the built-in prompt and send it to the agent; it will read your API docs and update the local settings file for you.
- **File-driven config** — everything lives in `~/.dsh/settings.yaml`, so you can edit it by hand or in the GUI.

## 🚀 Install

Add it as a bundle to your `web` profile:

```sh
cd ~/.dsh/profiles/web
dsh plugin add https://github.com/NanamiChiaki-7/dsh-temperature
```

or drop it into `node_modules` and add the row to `cordis.patch.yml`:

```yaml
- insert:
    - id: temperature
      name: dsh-temperature
```

Restart `dsh web`, then open **Settings → 参数设置**.

## 🛠️ Parameters

| Key               | Range / values                     | Notes                                              |
| ----------------- | ---------------------------------- | -------------------------------------------------- |
| `temperature`     | `0 – 2` (0.01)                     | Global default `1.0`; visible above chat.          |
| `top_p`           | `0 – 1` (0.01)                     | Hidden above chat by default.                      |
| `maxTokens`       | integer; `<= 0` = unlimited | A **toggle button** switches the limit on/off: off (unlimited) sends nothing so the provider's default applies; on lets you type a positive integer (keep it in the model's valid range, e.g. DeepSeek `[1, 393216]`). Default off. |
| `reasoningEffort` | `default · off · low · medium · high · max` | DeepSeek thinking mode. `default` = don't touch the harness's own effort; `off` disables thinking; `low`–`max` set the effort. |

Thinking mode is applied through `LlmCallConfig.reasoningEffort` and mapped by the DeepSeek adapter onto `thinking` / `reasoning_effort` on the wire.

## 🗂️ Per-provider parameter support

The `providerSupport` table is stored in **`~/.dsh/settings.yaml` → `parameters.providerSupport.<provider>.<param>`**. **Unchecked parameters are never sent**, so they can't break an API call.

| Provider (route)     | temperature | top_p | maxTokens | reasoning |
| -------------------- | ----------- | ----- | --------- | --------- |
| `deepseek(-official)`| ✓           | ✓     | ✓         | ✓         |
| `openai`             | ✓           | ✓     | ✓         | ✓         |
| `anthropic`          | ✓           | ✗     | ✓         | ✓         |
| `gemini` / `google`  | ✓           | ✓     | ✓         | ✓         |
| `moonshot` / `zhipu` / `qwen` | ✓  | ✓     | ✓         | ✓         |
| *your custom route*  | *you decide* | *you decide* | *you decide* | *you decide* |

**Known caveats** (verify against your own API docs):
- **Reasoning models** (OpenAI `o1`/`o3`/`gpt-5` with thinking, DeepSeek `R1`, …) often **reject or ignore `temperature` / `top_p`** — disable them for those models.
- **Anthropic Claude** does not accept `top_p`.

Not sure what your API supports? Open **参数设置**, click **复制 / Copy**, and send the prompt to the agent — it will check your API docs and update the settings file itself.

## 📚 References

- [DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)
- [DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)
- [Anthropic Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [OpenAI reasoning-model sampling constraints](https://github.com/danny-avila/LibreChat/issues/10737)
- [Vertex AI model parameters](https://firebase.google.cn/docs/vertex-ai/model-parameters)

## 📦 Layout

```
plugins/dsh-temperature/
├── lib/
│   ├── index.js     # host half (settings namespace + agent/request injection)
│   └── client.js    # browser half (settings page + above-chat strip)
├── src/index.ts     # canonical typed host source
├── cordis.patch.yml # bundle patch that mounts the host row
└── package.json     # dsh.client manifest + ./client export
```

## ⚖️ License

MIT
