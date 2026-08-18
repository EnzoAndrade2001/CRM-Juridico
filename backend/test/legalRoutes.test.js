const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../src/routes/legal');
const authenticate = require('../src/middlewares/authenticate');

function registeredRoutes() {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
      handlerCount: layer.route.stack.length,
    }));
}

const EXPECTED_ROUTES = [
  ['get', '/config'],
  ['get', '/summary'],
  ['get', '/clients'],
  ['post', '/clients'],
  ['get', '/clients/:id'],
  ['patch', '/clients/:id'],
  ['get', '/leads'],
  ['post', '/leads'],
  ['get', '/leads/:id'],
  ['patch', '/leads/:id'],
  ['get', '/matters'],
  ['post', '/matters'],
  ['get', '/matters/:id'],
  ['patch', '/matters/:id'],
  ['get', '/documents'],
  ['post', '/documents'],
  ['get', '/documents/:id'],
  ['patch', '/documents/:id'],
  ['get', '/documents/:id/file'],
  ['post', '/documents/:id/file'],
  ['get', '/tasks'],
  ['post', '/tasks'],
  ['patch', '/tasks/:id'],
];

test('todas as rotas do CRM jurídico estão registradas', () => {
  const routes = registeredRoutes();
  for (const [method, path] of EXPECTED_ROUTES) {
    const found = routes.find((route) => route.path === path && route.methods.includes(method));
    assert.ok(found, `rota ausente: ${method.toUpperCase()} ${path}`);
  }
});

test('nenhuma rota jurídica fica fora do middleware de autenticação', () => {
  // O primeiro layer sem rota é o router.use(authenticate) aplicado a todo o módulo.
  const firstMiddleware = router.stack.find((layer) => !layer.route);
  assert.equal(firstMiddleware.handle, authenticate);
  const firstRouteIndex = router.stack.findIndex((layer) => layer.route);
  const authIndex = router.stack.indexOf(firstMiddleware);
  assert.ok(authIndex < firstRouteIndex, 'authenticate precisa vir antes das rotas');
});

test('o envio de arquivos passa pelo middleware de upload validado', () => {
  const routes = registeredRoutes();
  const upload = routes.find((route) => route.path === '/documents/:id/file' && route.methods.includes('post'));
  const create = routes.find((route) => route.path === '/documents' && route.methods.includes('post'));
  // multer + tratamento de erro de upload + handler
  assert.equal(upload.handlerCount, 3);
  assert.equal(create.handlerCount, 3);
});

test('o tratador de erros jurídico é o último middleware do módulo', () => {
  const last = router.stack[router.stack.length - 1];
  assert.equal(last.route, undefined);
  assert.equal(last.name, 'handleLegalError');
});

test('não existem rotas de exclusão física nesta versão', () => {
  const hasDelete = registeredRoutes().some((route) => route.methods.includes('delete'));
  assert.equal(hasDelete, false, 'a política do MVP não prevê exclusão física de registros jurídicos');
});
