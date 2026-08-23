/**
 * cmsAuth.js — Provedor de OAuth do GitHub para o Decap CMS (/admin do site).
 *
 * Implementa o protocolo que o Decap CMS espera de um "external OAuth
 * provider" (o mesmo usado pelo antigo Netlify CMS): a UI do /admin abre
 * este endpoint numa popup, que redireciona pro GitHub, recebe o código de
 * volta em /callback, troca por um access_token e devolve pra popup via
 * postMessage. Nada disso toca dados do CRM — é só a ponte de login para
 * permitir commits no repositório a partir da tela de edição do site.
 *
 * Requer GITHUB_OAUTH_CLIENT_ID e GITHUB_OAUTH_CLIENT_SECRET (OAuth App
 * criado em https://github.com/settings/applications/new, com Authorization
 * callback URL apontando para <PUBLIC_URL>/api/cms-auth/callback).
 */
const router = require('express').Router();
const crypto = require('crypto');
const axios = require('axios');

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
// O repositório é público — public_repo é suficiente para o Decap commitar
// alterações de conteúdo, sem pedir acesso a repositórios privados do usuário.
const OAUTH_SCOPE = 'public_repo';

function callbackUrl(req) {
  const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  return `${base}/api/cms-auth/callback`;
}

const STATE_TTL_MS = 5 * 60 * 1000;

// State assinado (HMAC) em vez de guardado em sessão/cookie — evita depender
// de cookie-parser só para este fluxo. Carrega o timestamp de emissão para
// expirar sozinho e uma assinatura que comprova que fomos nós que geramos.
function signState() {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET || process.env.JWT_SECRET || 'cms-oauth-fallback';
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyState(state) {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET || process.env.JWT_SECRET || 'cms-oauth-fallback';
  const parts = String(state || '').split('.');
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, signature] = parts;
  const payload = `${issuedAt}.${nonce}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) return false;
  return Date.now() - Number(issuedAt) <= STATE_TTL_MS;
}

router.get('/auth', (req, res) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) return res.status(500).send('GITHUB_OAUTH_CLIENT_ID não configurada.');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl(req),
    scope: OAUTH_SCOPE,
    state: signState(),
  });
  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
});

function renderCallbackPage({ success, token, error }) {
  // Protocolo exato esperado pelo Decap CMS: uma mensagem
  // "authorizing:github" seguida de "authorization:github:success:<json>"
  // (ou "authorization:github:error:<json>") via window.postMessage, para a
  // janela que abriu a popup.
  const status = success ? 'success' : 'error';
  const payload = success ? { token, provider: 'github' } : { message: error || 'Falha na autenticação.' };
  const messageBody = `authorization:github:${status}:${JSON.stringify(payload)}`;

  return `<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(messageBody)}, e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;
}

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send(renderCallbackPage({ success: false, error: 'Código de autorização ausente.' }));
  }
  if (!verifyState(state)) {
    return res.status(400).send(renderCallbackPage({ success: false, error: 'Estado inválido ou expirado — tente fazer login novamente.' }));
  }

  try {
    const { data } = await axios.post(
      GITHUB_TOKEN_URL,
      {
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl(req),
      },
      { headers: { Accept: 'application/json' }, timeout: 10000 },
    );

    if (!data?.access_token) {
      return res.status(400).send(renderCallbackPage({ success: false, error: data?.error_description || 'GitHub não retornou um token.' }));
    }

    return res.send(renderCallbackPage({ success: true, token: data.access_token }));
  } catch (err) {
    return res.status(502).send(renderCallbackPage({ success: false, error: err.message }));
  }
});

module.exports = router;
