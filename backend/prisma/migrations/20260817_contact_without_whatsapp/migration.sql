-- Um cliente jurídico pode existir antes de qualquer conversa no WhatsApp.
-- A conexão continua obrigatória no Ticket, quando uma conversa for aberta.
ALTER TABLE "Contact"
ALTER COLUMN "instanceId" DROP NOT NULL;

ALTER TABLE "Contact"
DROP CONSTRAINT IF EXISTS "Contact_instanceId_fkey";

ALTER TABLE "Contact"
ADD CONSTRAINT "Contact_instanceId_fkey"
FOREIGN KEY ("instanceId") REFERENCES "WaInstance"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
