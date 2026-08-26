/**
 * dsh-temperature — browser half of the "参数设置" (Parameter Settings) module.
 *
 * Contributions:
 *   1. A dedicated Settings page (`settings.section`, id `parameters`) — one
 *      row per LLM sampling parameter (temperature / top_p / maxTokens / 思考
 *      模式 reasoningEffort) with a global default (slider + number) and an
 *      "above the chat" toggle, plus a per-provider parameter-support table
 *      and a copyable prompt that asks the agent to verify its API docs.
 *   2. An above-chat strip (`conversation.input.dock`), styled like the
 *      tasks/goals bar (centered rounded card, left-aligned controls, bordered,
 *      transparent inputs without spinner arrows), each visible parameter
 *      offering a slider + number control.
 *
 * Both bind the same `parameters` namespace the host plugin reads. The host
 * only sends a parameter a provider actually supports (per `providerSupport`),
 * so unsupported parameters are never sent and cannot break the API.
 */

window.__ModuleLoader__.load({
  id: "dsh-temperature",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");

    const NS = "parameters";

    const NUMERIC_PARAMS = [
      { key: "temperature", zh: "温度", en: "Temperature", min: 0, max: 2, step: 0.01 },
      { key: "top_p", zh: "Top-P", en: "Top-P", min: 0, max: 1, step: 0.01 },
      { key: "maxTokens", zh: "最大 Token 数", en: "Max tokens", min: 1, max: 1000000, step: 1 },
    ];
    const PROVIDER_COLUMNS = [
      { key: "temperature", zh: "温度" },
      { key: "top_p", zh: "Top-P" },
      { key: "maxTokens", zh: "Token" },
      { key: "reasoningEffort", zh: "思考" },
    ];
    const REASONING_OPTIONS = [
      { v: "default", zh: "默认（不干预）" },
      { v: "off", zh: "关闭思考" },
      { v: "low", zh: "低" },
      { v: "medium", zh: "中" },
      { v: "high", zh: "高" },
      { v: "max", zh: "最高" },
    ];

    // A copyable prompt the user can paste to the agent so it verifies the
    // provider's API docs and updates the local parameter settings file.
    const HINT_PROMPT = [
      "Read the LLM API documentation for the provider and model I use, and determine which sampling / reasoning " +
        "parameters it supports (temperature, top_p, max_tokens, reasoning_effort / thinking, etc.), and which " +
        "parameters are ignored or have no effect when set.",
      "Then edit the local parameter settings file ~/.dsh/settings.yaml: set parameters.providerSupport.<provider>.<param> " +
        "to false for unsupported parameters and true for supported ones, and adjust parameters.defaults / " +
        "parameters.overrides if needed.",
      "Tell me what you found first, then apply the changes.",
    ].join(" ");

    function clamp(value, min, max) {
      const n = Number(value);
      if (!Number.isFinite(n)) return NaN;
      return Math.max(min, Math.min(max, n));
    }

    function valueOf(state) {
      const raw = state && state.value && typeof state.value === "object" && !Array.isArray(state.value)
        ? state.value : {};
      return {
        defaults: raw.defaults && typeof raw.defaults === "object" ? raw.defaults : {},
        overrides: raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
        aboveChat: raw.aboveChat && typeof raw.aboveChat === "object" ? raw.aboveChat : {},
        providerSupport: raw.providerSupport && typeof raw.providerSupport === "object" ? raw.providerSupport : {},
      };
    }

    const rowStyle = { display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(128,128,128,0.18)" };
    const nameStyle = { width: "150px", flex: "0 0 auto", fontWeight: 600 };
    const fieldStyle = { flex: "1 1 auto", display: "flex", alignItems: "center", gap: "10px" };
    const chipStyle = { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", whiteSpace: "nowrap" };

    /** A slider + number input pair bound to one numeric value. */
    function SliderField(props) {
      const { min, max, step, value, disabled, onChange, width } = props;
      const safeValue = value === undefined || Number.isNaN(Number(value)) ? min : Number(value);
      const fill = max > min ? ((safeValue - min) / (max - min)) * 100 : 0;
      return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "8px" } },
        React.createElement("input", {
          className: "dsh-param-range", type: "range", min, max, step,
          value: safeValue, disabled,
          style: { "--dsh-param-fill": fill + "%" },
          onChange: (e) => { const v = clamp(e.target.value, min, max); if (Number.isFinite(v)) onChange(v); },
        }),
        React.createElement("input", {
          className: "dsh-param-num", type: "number", min, max, step,
          value: value === undefined ? "" : String(value),
          disabled, style: { width: width || "70px" },
          onChange: (e) => { const v = clamp(e.target.value, min, max); if (Number.isFinite(v)) onChange(v); },
        }),
      );
    }

    function ParameterSettingsSection(props) {
      const state = props.useParameters((s) => s);
      if (state.status === "unavailable") return null;
      const value = valueOf(state);
      const writable = state.writable && state.status === "ready";
      const busy = state.status === "saving";
      const [copied, setCopied] = React.useState(false);

      const onDefault = (key, min, max) => (v) => props.setDefault(key, v);
      const onToggle = (key) => (e) => props.setAboveChat(key, e.target.checked);
      const onSupport = (provider, key) => (e) => props.setProviderSupport(provider, key, e.target.checked);
      const onReasoning = (e) => props.setDefault("reasoningEffort", e.target.value);
      const onCopy = () => {
        try { navigator.clipboard.writeText(HINT_PROMPT); setCopied(true); } catch { setCopied(false); }
      };

      const providers = Object.keys(value.providerSupport);
      const supportRows = providers.map((provider) => {
        const sup = value.providerSupport[provider] || {};
        return React.createElement("tr", { key: provider },
          React.createElement("td", { style: { padding: "6px 8px", whiteSpace: "nowrap" } }, provider),
          PROVIDER_COLUMNS.map((p) => React.createElement("td", { key: p.key, style: { padding: "6px 8px", textAlign: "center" } },
            React.createElement("input", {
              type: "checkbox", checked: sup[p.key] !== false, disabled: !writable || busy,
              onChange: onSupport(provider, p.key), "aria-label": provider + " " + p.key,
            }),
          )),
        );
      });

      const reasoning = value.defaults.reasoningEffort || "default";
      return React.createElement("div", { style: { padding: "4px 0" } },
        React.createElement("p", { style: { color: "#888", marginBottom: "4px" } },
          "全局默认值在每次请求时生效；可在对话上方按会话覆盖。"),
        NUMERIC_PARAMS.map((p) => React.createElement("div", { key: p.key, style: rowStyle },
          React.createElement("span", { style: nameStyle }, p.zh + " / " + p.en),
          React.createElement("span", { style: fieldStyle },
            React.createElement("label", { style: chipStyle }, "默认 Default"),
            React.createElement(SliderField, {
              min: p.min, max: p.max, step: p.step,
              value: value.defaults[p.key],
              disabled: !writable || busy, onChange: onDefault(p.key, p.min, p.max),
            }),
          ),
          React.createElement("label", { style: chipStyle },
            React.createElement("input", {
              type: "checkbox", checked: value.aboveChat[p.key] === true, disabled: !writable || busy,
              onChange: onToggle(p.key),
            }),
            "对话上方 Above chat",
          ),
        )),
        React.createElement("div", { style: rowStyle },
          React.createElement("span", { style: nameStyle }, "思考模式 / DeepSeek Reasoning"),
          React.createElement("select", {
            className: "dsh-param-select", disabled: !writable || busy, style: { padding: "4px" },
            value: reasoning, onChange: onReasoning,
          },
            REASONING_OPTIONS.map((o) => React.createElement("option", { key: o.v, value: o.v }, o.zh)),
          ),
          React.createElement("span", { style: { color: "#888", fontSize: "12px" } },
            "DeepSeek 思考模式：off 关闭；low/high/max 控制推理强度；默认不干预。",
          ),
        ),
        React.createElement("div", { style: { marginTop: "14px" } },
          React.createElement("h4", { style: { margin: "0 0 6px" } }, "各 API 支持参数 Provider parameter support"),
          React.createElement("p", { style: { color: "#888", fontSize: "12px", margin: "0 0 6px" } },
            "在设置文件中按 API 增删/调整支持参数（~/.dsh/settings.yaml → parameters.providerSupport）。未勾选的参数不会被发送。"),
          React.createElement("table", { style: { borderCollapse: "collapse", fontSize: "13px" } },
            React.createElement("thead", null, React.createElement("tr", null,
              React.createElement("th", { style: { padding: "4px 8px", textAlign: "left" } }, "Provider"),
              PROVIDER_COLUMNS.map((p) => React.createElement("th", { key: p.key, style: { padding: "4px 8px" } }, p.zh)),
            )),
            React.createElement("tbody", null, supportRows),
          ),
          React.createElement("p", { style: { color: "#888", fontSize: "12px", marginTop: "8px", lineHeight: 1.6 } },
            "不同模型/API 对采样参数的支持不同。推理模型（如 OpenAI o1/o3、DeepSeek R1）通常不接受 temperature/top_p；" +
            "Anthropic 不支持 top_p。请以你自己使用的 API 文档为准进行调整。",
          ),
        ),
        React.createElement("div", { style: { marginTop: "14px", padding: "10px 12px", border: "1px dashed rgba(128,128,128,0.5)", borderRadius: "10px", background: "rgba(128,128,128,0.05)" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" } },
            React.createElement("h4", { style: { margin: 0 } }, "给 AI 的提示词 / Prompt for the AI"),
            React.createElement("button", {
              type: "button", disabled: !writable, style: { cursor: "pointer", padding: "2px 8px" },
              onClick: onCopy,
            }, copied ? "已复制 ✓ / Copied" : "复制 / Copy"),
          ),
          React.createElement("p", { style: { color: "#888", fontSize: "12px", lineHeight: 1.6, margin: 0 } },
            "如果你不确定自己的 API 是否支持修改参数，把下面这段提示词复制后发给 agent，它会自己查接口文档并修改本地的参数设置文件：/ If you are unsure whether your API supports changing these parameters, copy the prompt below and send it to the agent — it will check the API docs and update the local parameter settings file:",
          ),
          React.createElement("textarea", {
            className: "dsh-param-hint", readOnly: true, rows: 4,
            value: HINT_PROMPT,
            style: { width: "100%", boxSizing: "border-box", background: "transparent", border: "1px solid rgba(128,128,128,0.35)", borderRadius: "6px", padding: "6px", font: "inherit", color: "inherit" },
          }),
        ),
        React.createElement("p", { style: { color: "#888", fontSize: "12px", marginTop: "8px" } },
          writable ? "修改后即时生效。" : "只读 / Read-only",
        ),
      );
    }

    function ParameterDock(props) {
      const state = props.useParameters((s) => s);
      if (state.status === "unavailable") return null;
      const value = valueOf(state);
      const writable = state.writable && state.status === "ready";
      const sessionId = props.sessionId;
      const visible = NUMERIC_PARAMS.filter((p) => value.aboveChat[p.key] === true);
      if (visible.length === 0) return null;

      const override = (sessionId && value.overrides[sessionId]) || {};
      const effective = (key) => {
        const v = override[key];
        return v === undefined ? value.defaults[key] : v;
      };
      const onEdit = (key, min, max) => (v) => {
        if (!sessionId) return;
        props.setSessionOverride(sessionId, key, v);
      };

      const chips = visible.map((p) => React.createElement("label", { key: p.key, className: "dsh-param-chip" },
        React.createElement("span", null, p.zh),
        React.createElement(SliderField, {
          min: p.min, max: p.max, step: p.step,
          value: effective(p.key), disabled: !writable, onChange: onEdit(p.key, p.min, p.max),
          width: "52px",
        }),
      ));

      return React.createElement("div", { style: { width: "100%", display: "flex", justifyContent: "center", padding: "4px 0" } },
        React.createElement("div", { className: "dsh-param-bar" },
          React.createElement("span", { className: "dsh-param-label" }, "参数"),
          ...chips,
        ),
      );
    }

    const inject = ["slots", "settingsScope"];

    function apply(ctx) {
      const styleId = "dsh-temperature-styles";
      if (typeof document !== "undefined" && !document.getElementById(styleId)) {
        const el = document.createElement("style");
        el.id = styleId;
        el.textContent = [
          "input.dsh-param-num::-webkit-outer-spin-button,input.dsh-param-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}",
          "input.dsh-param-num{-moz-appearance:textfield;appearance:none;background:transparent;border:none;outline:none;color:inherit;font:inherit;padding:2px}",
          "input.dsh-param-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:linear-gradient(to right,var(--dsw-alias-state-business-primary,var(--dsw-static-deepseek-500,#4c8bf5)) var(--dsh-param-fill,0%),rgba(128,128,128,.28) var(--dsh-param-fill,0%));outline:none;width:120px;margin:0;cursor:pointer;transition:opacity .15s ease}",
          "input.dsh-param-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--dsw-alias-state-business-primary,var(--dsw-static-deepseek-500,#4c8bf5));box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer;margin-top:0;transition:transform .12s ease,box-shadow .12s ease}",
          "input.dsh-param-range::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 2px 8px rgba(0,0,0,.3)}",
          "input.dsh-param-range::-webkit-slider-thumb:active{transform:scale(1.05)}",
          "input.dsh-param-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid var(--dsw-alias-state-business-primary,var(--dsw-static-deepseek-500,#4c8bf5));box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}",
          "input.dsh-param-range::-moz-range-track{height:6px;border-radius:999px;background:rgba(128,128,128,.28)}",
          "input.dsh-param-range:disabled{opacity:.4;cursor:default}",
          ".dsh-param-bar{box-sizing:border-box;display:flex;align-items:center;gap:18px;width:100%;max-width:min(820px,100%);height:44px;padding:4px 12px;border:1px solid rgba(128,128,128,.35);border-radius:12px;background:rgba(128,128,128,.06)}",
          ".dsh-param-label{flex:none;font-size:12px;color:rgba(128,128,128,.75);white-space:nowrap}",
          ".dsh-param-chip{display:inline-flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap;color:inherit}",
          ".dsh-param-chip span{color:rgba(128,128,128,.75)}",
          "select.dsh-param-select{background:transparent;border:1px solid rgba(128,128,128,.35);border-radius:6px;outline:none;color:inherit;font:inherit}",
        ].join("\n");
        document.head.appendChild(el);
      }

      const scope = ctx.settingsScope.bind({ namespace: NS });

      const sectionInjected = () => ({
        hooks: { parameters: scope },
        setDefault: (key, value) => {
          const cur = scope.getSnapshot().value;
          const defaults = cur && cur.defaults && typeof cur.defaults === "object" ? { ...cur.defaults } : {};
          defaults[key] = value;
          return scope.set("defaults", defaults);
        },
        setAboveChat: (key, value) => {
          const cur = scope.getSnapshot().value;
          const aboveChat = cur && cur.aboveChat && typeof cur.aboveChat === "object" ? { ...cur.aboveChat } : {};
          aboveChat[key] = value;
          return scope.set("aboveChat", aboveChat);
        },
        setProviderSupport: (provider, key, value) => {
          const cur = scope.getSnapshot().value;
          const support = cur && cur.providerSupport && typeof cur.providerSupport === "object" ? { ...cur.providerSupport } : {};
          const row = support[provider] && typeof support[provider] === "object" ? { ...support[provider] } : {};
          row[key] = value;
          support[provider] = row;
          return scope.set("providerSupport", support);
        },
      });

      const dockInjected = () => ({
        hooks: { parameters: scope },
        setSessionOverride: (sessionId, key, value) => {
          const cur = scope.getSnapshot().value;
          const overrides = cur && cur.overrides && typeof cur.overrides === "object" ? { ...cur.overrides } : {};
          const sessionOverride = overrides[sessionId] && typeof overrides[sessionId] === "object" ? { ...overrides[sessionId] } : {};
          sessionOverride[key] = value;
          overrides[sessionId] = sessionOverride;
          return scope.set("overrides", overrides);
        },
      });

      ctx.slots.inject("settings.section", () => ctx.slots.register(
        { name: "settings.section", id: "parameters", order: 50, label: "参数设置", inject: sectionInjected },
        ParameterSettingsSection,
      ));

      ctx.slots.inject("conversation.input.dock", () => ctx.slots.register(
        { name: "conversation.input.dock", id: "parameters", order: 0, inject: dockInjected },
        ParameterDock,
      ));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
