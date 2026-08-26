<div align="center">

# dsh-temperature · 参数设置

**Parameter Settings for DeepSeek Harness** — tune your LLM's sampling right from the settings page and an above-the-chat strip, per session and per provider.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-web-green)
![Built for](https://img.shields.io/badge/built%20for-DeepSeek%20Harness-4c8bf5)

</div>

---

## ✨ Features

- **🎚️ Global defaults + per-session overrides** — set a default for `temperature`, `top_p`, `max_tokens` and DeepSeek's **思考模式 (thinking mode)**; override any of them for an individual session.
- **📏 Above-the-chat strip** — a centered, tasks/goals-style bar right above the input lets you tweak the *current* session's parameters on the fly with a polished **slider + number** control.
- **🏷️ Per-provider support table** — every API is different: tell the plugin which parameters each provider/model actually accepts, and unsupported ones are **never sent**, so a bad parameter can't break an API call.
- **🤖 Self-documenting** — if you don't know what your API supports, copy the built-in English prompt and send it to the agent; it will read your API docs and update the local settings file for you.
- **⚙️ File-driven config** — everything lives in `~/.dsh/settings.yaml`, so you can edit it by hand or in the GUI.

## 🚀 Install

Add it as a bundle to your `web` profile:

```sh
cd ~/.dsh/profiles/web
dsh plugin add <this-repo-url>.git
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
| `maxTokens`       | `1 – 1,000,000` (1)                | Hidden above chat by default.                      |
| `reasoningEffort` | `default · off · low · medium · high · max` | DeepSeek 思考模式. `default` = don't touch the harness's own effort; `off` disables thinking; `low`–`max` set the effort. |

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
