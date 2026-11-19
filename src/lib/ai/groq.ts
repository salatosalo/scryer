export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

export async function callGroqJson(input: {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  const model = (input.model || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim();

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 220)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error('Groq returned an empty response');
  }

  return { text, model };
}
