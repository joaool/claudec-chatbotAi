import OpenAI from 'openai';

// Lazy initialization — avoids throwing at build time when env vars aren't present
let _client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// Proxy so callers can use `openai.responses.create(...)` as normal
export const openai = new Proxy<OpenAI>({} as OpenAI, {
  get(_, prop) {
    return Reflect.get(getClient(), prop as string);
  },
});
