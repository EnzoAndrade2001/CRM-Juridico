// Service Worker mínimo: existe apenas para o app ser instalável como PWA.
//
// Não há listener de 'fetch' de propósito. A versão anterior interceptava
// todas as requisições com event.respondWith(fetch(event.request)) sem fazer
// cache nenhum, o que não trazia benefício e transformava qualquer falha
// momentânea de rede — deploy em andamento, requisição cancelada ao trocar de
// tela — em erro de navegação, deixando a tela em branco.
//
// Sem esse listener, o navegador cuida das requisições normalmente e trata os
// erros de rede como sempre tratou.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
