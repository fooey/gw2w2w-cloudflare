export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('Hello from Emblem Engine!');
  },
};

interface Env {
  EMBLEM_ENGINE_GUILD_LOOKUP: KVNamespace;
}