import { AgentSettings } from '../types';

type ImageResult = { url: string };

export async function generateUiImage(prompt: string, settings?: AgentSettings): Promise<ImageResult> {
  if (!settings?.apiKey) throw new Error('API key ausente para imagem (OpenAI).');
  if (settings.provider !== 'openai') throw new Error('Imagem disponível apenas quando o provedor é OpenAI.');

  const body = {
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    response_format: 'url',
  };

  const resp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Erro ao gerar imagem: ${err}`);
  }

  const data = await resp.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error('Resposta de imagem inválida.');
  return { url };
}
