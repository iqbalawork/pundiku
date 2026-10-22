const API_TIMEOUT_MS = 30000;

class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function api(action, payload) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), API_TIMEOUT_MS) : null;
  let res;
  try {
    res = await fetch(window.PUNDIKU_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: session.token || '', payload: payload || {} }),
      redirect: 'follow',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });
  } catch (err) {
    const timeout = err && err.name === 'AbortError';
    throw new ApiError(timeout ? 'TIMEOUT' : 'NETWORK', timeout
      ? 'Server kelamaan merespons. Coba lagi ya.'
      : 'Koneksi lagi bermasalah. Cek internet kamu dulu.');
  } finally {
    if (timer) clearTimeout(timer);
  }

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    throw new ApiError('BAD_RESPONSE', 'Respons server nggak terbaca. Coba lagi sebentar.');
  }

  if (!body || !body.ok) {
    const err = new ApiError((body && body.code) || 'SERVER_ERROR', (body && body.message) || 'Ada kendala di server. Coba lagi ya.');
    if (err.code === 'UNAUTHORIZED' && typeof onSessionExpired === 'function') onSessionExpired(err.message);
    throw err;
  }
  return body.data;
}
