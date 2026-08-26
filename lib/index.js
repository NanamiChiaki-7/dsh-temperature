/**
 * dsh-temperature — host half of the "参数设置" (Parameter Settings) module.
 *
 * Registers a `parameters` settings namespace (global defaults + per-session
 * overrides + which params appear above the chat + per-provider parameter
 * support) and injects the resolved sampling values into every agent LLM
 * request through the `agent/request` waterfall.
 *
 * Precedence per request: `overrides[sessionId]` first, then `defaults`. Only
 * fields a provider actually supports (per `providerSupport`) are applied, so
 * a parameter a model cannot take is never sent and cannot break the API.
 *
 * `reasoningEffort` controls DeepSeek thinking mode: `default` leaves the
 * harness's own effort untouched; `off` disables thinking; low/medium/high/max
 * set the effort (the adapter maps them onto `thinking`/`reasoning_effort`).
 */

import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'

/** Reasoning / thinking levels offered by the parameter control. */
const ReasoningLevels = z.union(['default', 'off', 'low', 'medium', 'high', 'max'])

/** Which sampling parameters a provider/model accepts on the wire. */
const ProviderSupportFields = z.object({
  temperature: z.boolean().default(true),
  top_p: z.boolean().default(true),
  maxTokens: z.boolean().default(true),
  reasoningEffort: z.boolean().default(true),
})

/** Sensible defaults per mainstream provider (edit via the settings file). */
const DEFAULT_PROVIDER_SUPPORT = {
  'deepseek-official': { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  deepseek: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  openai: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  anthropic: { temperature: true, top_p: false, maxTokens: true, reasoningEffort: true },
  gemini: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  google: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  moonshot: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  zhipu: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
  qwen: { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true },
}

/** Per-parameter sampling values (numeric). */
const SamplingFields = z.object({
  temperature: z.number().step(0.01).min(0).max(2).default(1.0),
  top_p: z.number().step(0.01).min(0).max(1).default(1.0),
  maxTokens: z.number().step(1).min(1).max(1_000_000),
})

const OverrideFields = z.object({
  temperature: z.number().step(0.01).min(0).max(2),
  top_p: z.number().step(0.01).min(0).max(1),
  maxTokens: z.number().step(1).min(0).max(1_000_000),
  reasoningEffort: ReasoningLevels,
})

const DefaultsFields = z.object({
  temperature: z.number().step(0.01).min(0).max(2).default(1.0),
  top_p: z.number().step(0.01).min(0).max(1).default(1.0),
  maxTokens: z.number().step(1).min(0).max(1_000_000),
  reasoningEffort: ReasoningLevels.default('default'),
})

/** Schema for the `parameters` settings namespace, surfaced in the settings UI. */
export const ParametersSchema = z.object({
  defaults: DefaultsFields,
  overrides: z.dict(OverrideFields).default({}),
  aboveChat: z.object({
    temperature: z.boolean().default(true),
    top_p: z.boolean().default(false),
    maxTokens: z.boolean().default(false),
  }),
  providerSupport: z.dict(ProviderSupportFields).default(DEFAULT_PROVIDER_SUPPORT),
})

/** Hard dependency on the settings capability, whose service is present at boot. */
export const inject = ['settings']

/**
 * Mount the parameter control: register the namespace and inject the resolved
 * sampling values into every agent request, restricted to the provider's
 * supported parameters.
 * @param ctx - plugin-scoped context.
 */
export function apply(ctx) {
  const scope = ctx.settings.register(settingsNamespace('parameters'), ParametersSchema)

  ctx.on('agent/request', async ({ agent }, next) => {
    const resolved = await next()
    const current = scope.get()
    const support = current.providerSupport?.[resolved.provider]
      ?? { temperature: true, top_p: true, maxTokens: true, reasoningEffort: true }
    const override = current.overrides[agent.id] ?? {}
    const defaults = current.defaults ?? {}

    const pick = (key, min, max) => {
      if (support[key] === false) return undefined
      const v = override[key] ?? defaults[key]
      return v === undefined ? undefined : Math.min(max, Math.max(min, v))
    }
    // maxTokens: <= 0 (or unset) means unlimited — do not send max_tokens so
    // the provider's default applies and the API never sees an out-of-range value.
    const pickMaxTokens = () => {
      if (support.maxTokens === false) return undefined
      const v = override.maxTokens ?? defaults.maxTokens
      if (v === undefined || v <= 0) return undefined
      return Math.min(1_000_000, Math.max(1, v))
    }
    const temperature = pick('temperature', 0, 2)
    const top_p = pick('top_p', 0, 1)
    const maxTokens = pickMaxTokens()

    // Thinking mode: only touch the request's reasoning effort when the user
    // chose a non-default level AND the provider supports reasoning effort.
    const reasoningEffort = support.reasoningEffort !== false
      ? override.reasoningEffort ?? defaults.reasoningEffort
      : 'default'

    if (temperature === undefined && top_p === undefined && maxTokens === undefined
      && reasoningEffort === 'default') return resolved

    return {
      ...resolved,
      ...(temperature === undefined || temperature === resolved.temperature ? {} : { temperature }),
      ...(top_p === undefined || top_p === resolved.top_p ? {} : { top_p }),
      ...(maxTokens === undefined || maxTokens === resolved.maxTokens ? {} : { maxTokens }),
      ...(reasoningEffort === 'default' || reasoningEffort === resolved.reasoningEffort ? {} : { reasoningEffort }),
    }
  })
}
