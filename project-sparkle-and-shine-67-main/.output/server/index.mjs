export default {
  async fetch(request, env, ctx) {
    return new Response("Build in progress...", { status: 503 });
  }
};
export const fetch = async () => new Response("Build in progress...", { status: 503 });
