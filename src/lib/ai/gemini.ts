import { GoogleGenAI } from '@google/genai';
import { AI_COACHING_JSON_SCHEMA } from './schema';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export async function callGeminiJson(input: {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  const model = (input.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const timeoutMs = input.timeoutMs || 25000;

  console.log(`[Gemini] Calling ${model} (timeout: ${timeoutMs}ms, thinking: minimal)...`);
  const t0 = Date.now();

  const interactionPromise = ai.interactions.create({
    model,
    system_instruction: input.systemPrompt,
    input: input.userPrompt,
    store: false,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: AI_COACHING_JSON_SCHEMA,
    },
    generation_config: {
      thinking_level: 'minimal',
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Gemini request to ${model} timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  );

  const interaction = await Promise.race([interactionPromise, timeoutPromise]);
  const elapsed = Date.now() - t0;

  const text = interaction.output_text;
  if (!text || !text.trim()) {
    console.error(`[Gemini] ${model} returned empty response after ${elapsed}ms`);
    throw new Error('Gemini returned an empty response');
  }

  console.log(`[Gemini] ${model} responded in ${elapsed}ms (chars: ${text.length})`);
  return { text, model };
}
