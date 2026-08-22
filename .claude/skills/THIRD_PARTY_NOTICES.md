# Skills de terceiros

## datajud / djen

Vendorizadas a partir de <https://github.com/rvsanches/skills-datajud-djen>
(autor: Ricardo Sanches), licença MIT — ver
[THIRD_PARTY_LICENSE-datajud-djen.txt](THIRD_PARTY_LICENSE-datajud-djen.txt).

Documentam conhecimento de produção sobre as APIs públicas do CNJ:

- **datajud** — consulta de metadados e movimentações processuais
  (`api-publica.datajud.cnj.jus.br`). Usado pelo
  [`dataJudService.js`](../../backend/src/services/dataJudService.js) e pelo
  [`legalProcessMonitorService.js`](../../backend/src/services/legalProcessMonitorService.js).
- **djen** — intimações e publicações do Comunica PJe
  (`comunicaapi.pje.jus.br`). Ainda não integrado ao backend; a skill fica
  disponível para quando essa frente for implementada.

Cópias legíveis por humanos em [`docs/datajud.md`](../../docs/datajud.md) e
[`docs/djen.md`](../../docs/djen.md).
