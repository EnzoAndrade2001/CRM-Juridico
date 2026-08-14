from __future__ import annotations

import argparse
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import re
from decimal import Decimal
import sys
import time
import threading
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import firebirdsql
import requests
from dotenv import load_dotenv


if getattr(sys, "frozen", False):
    ROOT = Path(sys.executable).resolve().parent
else:
    ROOT = Path(__file__).resolve().parent


def digits(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\D+", "", str(value))
    return text or None


def first_non_empty(*values: Any) -> str | None:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def fit_text(value: Any, max_length: int) -> str:
    if value is None:
        return ""
    return str(value).strip()[:max_length]


def is_duplicate_key_error(error: Exception) -> bool:
    message = str(error or "").upper()
    return (
        "PRIMARY OR UNIQUE KEY" in message
        or "DUPLICATE VALUE" in message
        or "VIOLATION OF PRIMARY" in message
    )


def parse_firebird_timestamp(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")

    text = str(value).strip()
    match = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2}):(\d{2})", text)
    if not match:
        return None

    dd, mm, yyyy, hh, mi, ss = match.groups()
    return datetime(
        int(yyyy), int(mm), int(dd), int(hh), int(mi), int(ss)
    ).isoformat(timespec="seconds")


def parse_firebird_timestamp_to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    match = re.match(r"(\d{2})/(\d{2})/(\d{4}) (\d{2}):(\d{2}):(\d{2})", text)
    if not match:
        return None

    dd, mm, yyyy, hh, mi, ss = match.groups()
    return datetime(int(yyyy), int(mm), int(dd), int(hh), int(mi), int(ss))


def normalize_phone(*values: Any) -> str | None:
    for value in values:
        phone = digits(value)
        if phone:
            # Keep only numeric content; backend will normalize if needed.
            return phone
    return None


def compose_brazil_phone(area_code: Any, number: Any) -> str | None:
    area = digits(area_code)
    local = digits(number)
    if not local:
        return None
    if area:
        return f"{area}{local}"
    return local


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.hex()
    return value


@dataclass
class AppConfig:
    firebird_host: str = "127.0.0.1"
    firebird_port: int = 3050
    firebird_database: str = ""
    firebird_user: str = "SYSDBA"
    firebird_password: str = ""
    firebird_charset: str = "WIN1252"
    crm_base_url: str = ""
    crm_tenant_slug: str = ""
    crm_sync_token: str = ""
    sync_interval_seconds: int = 300
    batch_size: int = 250
    sync_service_orders: bool = True
    state_file: Path = field(default_factory=lambda: ROOT / "state.json")
    log_dir: Path = field(default_factory=lambda: ROOT / "logs")
    log_file: Path = field(default_factory=lambda: ROOT / "logs" / "client.log")
    log_max_bytes: int = 5 * 1024 * 1024
    log_backup_count: int = 5
    log_level: str = "INFO"
    billing_folder_path: str = r"C:\ILUX\boletos_enviar"
    own_cnpj: str = "35.692.721/0001-94"
    billing_send_policy: str = "Somente Marcados"

    @classmethod
    def from_env(cls) -> "AppConfig":
        load_dotenv(ROOT / ".env")

        def env_int(name: str, default: int) -> int:
            try:
                return int(os.getenv(name, str(default)))
            except ValueError:
                return default

        def env_bool(name: str, default: bool) -> bool:
            value = os.getenv(name)
            if value is None:
                return default
            return value.strip().lower() in {"1", "true", "yes", "sim", "s"}

        def resolve_path(value: str, default: Path) -> Path:
            path = Path(value) if value else default
            if not path.is_absolute():
                path = ROOT / path
            return path

        state_file = Path(os.getenv("STATE_FILE", "state.json"))
        if not state_file.is_absolute():
            state_file = ROOT / state_file

        log_dir = resolve_path(os.getenv("LOG_DIR", "logs"), ROOT / "logs")
        log_file = resolve_path(os.getenv("LOG_FILE", "logs/client.log"), ROOT / "logs" / "client.log")

        return cls(
            firebird_host=os.getenv("FIREBIRD_HOST", "127.0.0.1"),
            firebird_port=env_int("FIREBIRD_PORT", 3050),
            firebird_database=os.getenv("FIREBIRD_DATABASE", ""),
            firebird_user=os.getenv("FIREBIRD_USER", "SYSDBA"),
            firebird_password=os.getenv("FIREBIRD_PASSWORD", ""),
            firebird_charset=os.getenv("FIREBIRD_CHARSET", "WIN1252"),
            crm_base_url=os.getenv("CRM_BASE_URL", "").rstrip("/"),
            crm_tenant_slug=os.getenv("CRM_TENANT_SLUG", ""),
            crm_sync_token=os.getenv("CRM_SYNC_TOKEN", ""),
            sync_interval_seconds=env_int("SYNC_INTERVAL_SECONDS", 300),
            batch_size=env_int("BATCH_SIZE", 250),
            # Variável nova de propósito: instalações antigas costumam ter
            # SYNC_SERVICE_ORDERS=false para bloquear o antigo scan completo.
            # O incremental seguro fica ativo por padrão sem exigir editar .env.
            sync_service_orders=env_bool("SYNC_SERVICE_ORDERS_INCREMENTAL", True),
            state_file=state_file,
            log_dir=log_dir,
            log_file=log_file,
            log_max_bytes=env_int("LOG_MAX_BYTES", 5 * 1024 * 1024),
            log_backup_count=env_int("LOG_BACKUP_COUNT", 5),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            billing_folder_path=os.getenv("BILLING_FOLDER_PATH", r"C:\ILUX\boletos_enviar"),
            own_cnpj=os.getenv("OWN_CNPJ", "35.692.721/0001-94"),
            billing_send_policy=os.getenv("BILLING_SEND_POLICY", "Somente Marcados"),
        )


class StateStore:
    def __init__(self, path: Path):
        self.path = path
        self.data: dict[str, Any] = {
            "cursors": {
                "contacts": 0,
                "equipments": 0,
                "contracts": 0,
                "serviceOrders": 0,
                "serviceOrderAttendances": 0,
            },
            "last_sync_at": None,
        }
        self.load()

    def load(self) -> None:
        if not self.path.exists():
            return

        try:
            self.data.update(json.loads(self.path.read_text(encoding="utf-8")))
        except Exception as exc:
            logging.warning("Falha ao ler state %s: %s", self.path, exc)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def get_cursor(self, key: str) -> int:
        return int(self.data.get("cursors", {}).get(key, 0) or 0)

    def set_cursor(self, key: str, value: int) -> None:
        self.data.setdefault("cursors", {})[key] = int(value)

    def set_last_sync_at(self, value: str | None) -> None:
        self.data["last_sync_at"] = value


class CommandResultStore:
    """Durable idempotency ledger for commands that write to Firebird."""

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.data: dict[str, dict[str, Any]] = {}
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                self.data = raw
        except Exception as exc:
            logging.warning("Falha ao ler resultados de comandos %s: %s", self.path, exc)

    def get(self, command_id: str) -> dict[str, Any] | None:
        with self.lock:
            value = self.data.get(str(command_id))
            return dict(value) if isinstance(value, dict) else None

    def set(self, command_id: str, result: dict[str, Any]) -> None:
        with self.lock:
            self.data[str(command_id)] = {
                **result,
                "recordedAt": datetime.now().isoformat(timespec="seconds"),
            }
            temporary = self.path.with_suffix(self.path.suffix + ".tmp")
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary.write_text(
                json.dumps(self.data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            temporary.replace(self.path)


class CRMClient:
    def __init__(self, config: AppConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "x-firebird-token": config.crm_sync_token,
            }
        )

    def push(self, entity: str, records: list[dict[str, Any]]) -> dict[str, Any]:
        if not records:
            return {"ok": True, "stats": {"received": 0}}

        url = f"{self.config.crm_base_url}/api/integrations/firebird/push"
        response = self.session.post(
            url,
            json={
                "tenantSlug": self.config.crm_tenant_slug,
                "entity": entity,
                "records": records,
            },
            timeout=120,
        )
        response.raise_for_status()
        return response.json()

    def process_pending_commands(
        self,
        repo: FirebirdRepository,
        result_store: CommandResultStore,
        wait_seconds: int = 0,
    ) -> None:
        url = f"{self.config.crm_base_url}/api/integrations/firebird/pending-commands"
        try:
            response = self.session.get(
                url,
                params={
                    "tenantSlug": self.config.crm_tenant_slug,
                    "wait": max(0, min(int(wait_seconds), 25)),
                },
                timeout=max(30, wait_seconds + 10),
            )
            response.raise_for_status()
            commands = response.json()
            if not commands:
                return

            logging.info("Recebidos %s comandos pendentes do CRM", len(commands))
            for cmd in commands:
                cmd_id = cmd["id"]
                cmd_type = cmd["type"]
                payload = cmd["payload"]

                try:
                    if cmd_type == "CREATE_OS":
                        cached = result_store.get(cmd_id)
                        if cached and cached.get("seqOs"):
                            seq_os = int(cached["seqOs"])
                            command_result = dict(cached)
                            logging.info(
                                "Comando %s ja processado; reenviando SEQOS %s.",
                                cmd_id,
                                seq_os,
                            )
                        else:
                            seq_os = repo.create_service_order(payload)
                            command_result = {"seqOs": seq_os}
                            try:
                                command_result["printData"] = repo.fetch_service_order_print_data(seq_os)
                            except Exception as print_data_error:
                                logging.warning(
                                    "O.S. %s criada, mas o historico para impressao nao foi consultado: %s",
                                    seq_os,
                                    print_data_error,
                                )
                            # Persist before callback. If HTTPS fails, replaying this
                            # command returns the same SEQOS instead of inserting again.
                            result_store.set(cmd_id, command_result)
                        self.report_command_result(cmd_id, success=True, result=command_result)
                        logging.info("O.S. criada no Firebird com sucesso. SEQOS: %s", seq_os)
                    elif cmd_type == "PROCESS_BILLING":
                        logging.info("Comando PROCESS_BILLING recebido sob demanda. Processando...")
                        self.process_billing_folder()
                        self.report_command_result(cmd_id, success=True)
                        logging.info("Comando PROCESS_BILLING processado com sucesso.")
                    else:
                        logging.warning("Tipo de comando desconhecido: %s", cmd_type)
                except Exception as e:
                    logging.exception("Erro ao processar comando %s:", cmd_id)
                    self.report_command_result(cmd_id, success=False, error=str(e))
        except Exception as e:
            logging.error("Falha ao buscar ou processar comandos do CRM: %s", e)

    def report_command_result(self, command_id: str, success: bool, result: dict | None = None, error: str | None = None) -> None:
        url = f"{self.config.crm_base_url}/api/integrations/firebird/pending-commands/{command_id}/callback"
        for attempt in range(1, 4):
            try:
                response = self.session.post(
                    url,
                    json={
                        "tenantSlug": self.config.crm_tenant_slug,
                        "success": success,
                        "result": result,
                        "error": error
                    },
                    timeout=30
                )
                response.raise_for_status()
                return
            except Exception as exc:
                logging.error(
                    "Falha ao reportar resultado do comando %s (tentativa %s/3): %s",
                    command_id,
                    attempt,
                    exc,
                )
                if attempt < 3:
                    time.sleep(attempt)

    def send_ping(self) -> None:
        url = f"{self.config.crm_base_url}/api/integrations/firebird/ping"
        try:
            self.session.post(
                url,
                json={"tenantSlug": self.config.crm_tenant_slug},
                timeout=10
            )
        except Exception as e:
            logging.error("Falha ao enviar ping: %s", e)

    def process_billing_folder(self) -> None:
        folder_path = self.config.billing_folder_path
        if not folder_path or not os.path.exists(folder_path):
            logging.warning("Pasta de cobranças não configurada ou não existe: %s", folder_path)
            return

        import shutil
        try:
            from pypdf import PdfReader
        except ImportError:
            logging.error("Biblioteca pypdf não encontrada. Por favor, execute 'pip install pypdf'.")
            return

        # Regexes para CNPJ/CPF
        cnpj_pattern = re.compile(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}|\b\d{14}\b')
        cpf_pattern = re.compile(r'\d{3}\.\d{3}\.\d{3}-\d{2}|\b\d{11}\b')

        own_cnpj_clean = re.sub(r'\D', '', self.config.own_cnpj)

        try:
            files = [f for f in os.listdir(folder_path) if f.lower().endswith('.pdf')]
        except Exception as err:
            logging.error("Erro ao listar pasta de cobranças: %s", err)
            return

        if not files:
            return

        logging.info("Encontrados %d arquivos PDF na pasta de cobranças", len(files))

        # Agrupamento por CPF/CNPJ
        grouped_files = {}  # { cpfCnpj: [filepaths] }
        unidentified_files = []

        for filename in files:
            filepath = os.path.join(folder_path, filename)
            try:
                text = ""
                with open(filepath, 'rb') as f:
                    reader = PdfReader(f)
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                
                cnpjs = cnpj_pattern.findall(text)
                cpfs = cpf_pattern.findall(text)

                customer_id = None

                # Filtra CNPJ do emitente
                for cnpj_val in cnpjs:
                    cleaned = re.sub(r'\D', '', cnpj_val)
                    if cleaned != own_cnpj_clean:
                        customer_id = cleaned
                        break

                if not customer_id:
                    # Filtra CPF
                    for cpf_val in cpfs:
                        cleaned = re.sub(r'\D', '', cpf_val)
                        customer_id = cleaned
                        break

                if customer_id:
                    grouped_files.setdefault(customer_id, []).append(filepath)
                else:
                    logging.warning("Não foi possível identificar o CPF/CNPJ no arquivo %s", filename)
                    unidentified_files.append(filepath)

            except Exception as e:
                logging.error("Erro ao ler PDF %s: %s", filename, e)
                unidentified_files.append(filepath)

        # Processar arquivos não identificados movendo para 'erros'
        if unidentified_files:
            error_dir = os.path.join(folder_path, "erros")
            os.makedirs(error_dir, exist_ok=True)
            for filepath in unidentified_files:
                dest = os.path.join(error_dir, os.path.basename(filepath))
                try:
                    shutil.move(filepath, dest)
                    logging.info("Arquivo com erro movido para a pasta de erros: %s", os.path.basename(filepath))
                except Exception as mv_err:
                    logging.error("Erro ao mover arquivo com erro %s: %s", filepath, mv_err)

        if not grouped_files:
            return

        # Enviar arquivos agrupados por cliente
        url = f"{self.config.crm_base_url}/api/integrations/firebird/send-billing"
        
        # Mapeamento do mês para pasta de arquivo
        meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
        now = datetime.now()
        month_name = meses[now.month - 1]
        dest_folder_name = f"Enviados - {month_name} {now.year}"
        dest_dir = os.path.join(folder_path, dest_folder_name)

        for customer_id, filepaths in grouped_files.items():
            logging.info("Enviando lote de %d arquivos para o cliente %s", len(filepaths), customer_id)
            
            files_payload = []
            opened_files = []
            try:
                for fp in filepaths:
                    f = open(fp, 'rb')
                    opened_files.append(f)
                    files_payload.append(('media', (os.path.basename(fp), f, 'application/pdf')))

                data = {
                    'tenantSlug': self.config.crm_tenant_slug,
                    'cpfCnpj': customer_id,
                    'sendPolicy': self.config.billing_send_policy
                }
                headers = {
                    'x-firebird-token': self.config.crm_sync_token
                }
                # Usa requests.post diretamente para evitar que o Content-Type: application/json da sessão
                # interfira na geração dos boundaries do multipart/form-data.
                response = requests.post(url, files=files_payload, data=data, headers=headers, timeout=120)
                response.raise_for_status()
                
                # Fechar arquivos antes de mover
                for f in opened_files:
                    try:
                        f.close()
                    except Exception:
                        pass
                opened_files = []
                
                # Se deu certo, move os arquivos para a pasta de arquivos do mês
                os.makedirs(dest_dir, exist_ok=True)
                for fp in filepaths:
                    shutil.move(fp, os.path.join(dest_dir, os.path.basename(fp)))
                
                logging.info("Lote enviado com sucesso para %s. Arquivos arquivados em %s", customer_id, dest_folder_name)

            except Exception as e:
                logging.error("Falha ao enviar lote de cobrança para %s: %s", customer_id, e)
                # Fechar arquivos antes de mover para pasta de erros
                for f in opened_files:
                    try:
                        f.close()
                    except Exception:
                        pass
                opened_files = []

                # Se falhou, move os arquivos para a pasta de erros
                error_dir = os.path.join(folder_path, "erros")
                os.makedirs(error_dir, exist_ok=True)
                for fp in filepaths:
                    try:
                        shutil.move(fp, os.path.join(error_dir, os.path.basename(fp)))
                    except Exception as mv_err:
                        logging.error("Erro ao mover arquivo com erro %s para pasta de erros: %s", fp, mv_err)
            finally:
                for f in opened_files:
                    try:
                        f.close()
                    except Exception:
                        pass


class FirebirdRepository:
    def __init__(self, config: AppConfig):
        self.config = config

    def connect(self):
        if not self.config.firebird_database:
            raise RuntimeError("FIREBIRD_DATABASE não configurado.")

        return firebirdsql.connect(
            host=self.config.firebird_host,
            port=self.config.firebird_port,
            database=self.config.firebird_database,
            user=self.config.firebird_user,
            password=self.config.firebird_password,
            charset=self.config.firebird_charset,
        )

    def _rows(self, sql: str, params: tuple[Any, ...]) -> Iterator[dict[str, Any]]:
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute(sql, params)
            columns = [desc[0].lower() for desc in cur.description]

            while True:
                batch = cur.fetchmany(self.config.batch_size)
                if not batch:
                    break
                for row in batch:
                    yield dict(zip(columns, row))
        finally:
            try:
                con.close()
            except Exception:
                pass

    def inspect_schema(self, sample_rows: int = 3) -> dict[str, Any]:
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute(
                """
                select
                    trim(rdb$relation_name) as relation_name,
                    case
                      when rdb$view_blr is null then 'TABLE'
                      else 'VIEW'
                    end as relation_type
                from rdb$relations
                where coalesce(rdb$system_flag, 0) = 0
                order by rdb$relation_name
                """
            )
            relations = [
                {"name": str(row[0]).strip(), "type": str(row[1]).strip()}
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                select
                    trim(rf.rdb$relation_name) as relation_name,
                    trim(rf.rdb$field_name) as field_name,
                    f.rdb$field_type,
                    f.rdb$field_length,
                    f.rdb$field_scale,
                    rf.rdb$field_position
                from rdb$relation_fields rf
                join rdb$fields f on f.rdb$field_name = rf.rdb$field_source
                join rdb$relations r on r.rdb$relation_name = rf.rdb$relation_name
                where coalesce(r.rdb$system_flag, 0) = 0
                order by rf.rdb$relation_name, rf.rdb$field_position
                """
            )
            columns_by_relation: dict[str, list[dict[str, Any]]] = {}
            for row in cur.fetchall():
                relation_name = str(row[0]).strip()
                columns_by_relation.setdefault(relation_name, []).append(
                    {
                        "name": str(row[1]).strip(),
                        "typeCode": row[2],
                        "length": row[3],
                        "scale": row[4],
                        "position": row[5],
                    }
                )

            samples: dict[str, list[dict[str, Any]]] = {}
            for relation in relations:
                name = relation["name"]
                try:
                    cur.execute(f'select first {int(sample_rows)} * from "{name}"')
                    field_names = [desc[0].strip() for desc in cur.description]
                    samples[name] = [
                        {field_names[index]: json_safe(value) for index, value in enumerate(row)}
                        for row in cur.fetchall()
                    ]
                except Exception as exc:
                    samples[name] = [{"error": str(exc)}]

            return {
                "generatedAt": datetime.now().isoformat(timespec="seconds"),
                "relations": relations,
                "columns": columns_by_relation,
                "samples": samples,
            }
        finally:
            try:
                con.close()
            except Exception:
                pass

    def fetch_contacts(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                cli.CDCLIENTE, cli.NMCLIENTE, cli.FANTASIA, cli.CPF, cli.CNPJ, cli.CIDADE, cli.UF, cli.CEP,
                cli.ENDERECO, cli.NUM, cli.COMPLEMENTO, cli.BAIRRO, cli.DDD, cli.FONE1, cli.FONE2, cli.CELULAR, cli.FAX, cli.EMAIL, cli.CONTATO,
                cli.INCLUSAO, cli.ATUALIZADO,
                (
                    select sum(
                        coalesce(c.TR_VL_FIXO, 0) +
                        coalesce((
                            select sum(m.VALFRANQUIA)
                            from IXLCONTRATOSMED m
                            where m.SEQCONTRATO = c.SEQCONTRATO
                              and coalesce(m.TFMEDIDORATIVO, 'S') <> 'N'
                        ), 0)
                    )
                    from IXLCONTRATOSGRP g
                    join IXLCONTRATOS c on c.SEQCONTRATOGRP = g.SEQCONTRATOGRP
                    where g.CDCLIENTE = cli.CDCLIENTE
                      and c.STATUS = 'G'
                ) as TOTAL_MENSALIDADE
            from ICLIENTES cli
            where cli.CDCLIENTE > ?
            order by cli.CDCLIENTE
        """
        yield from self._rows(sql, (cursor,))

    def fetch_equipments(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                eq.CDEQUIPAMENTO, eq.CDCLIENTE, eq.CDPRODUTO, eq.SERIE, eq.MODELO, eq.FABRICANTE,
                eq.SEQCONTRATO, eq.PATRIMONIO, eq.TFINATIVO,
                eq.ENDERECO, eq.NUM, eq.BAIRRO, eq.COMPLEMENTO, eq.LOCALINSTAL, eq.DEPARTAMENTO, eq.CONTATO, eq.FONE, eq.DDD, eq.CIDADE, eq.UF,
                eq.INCLUSAO, eq.ATUALIZADO,
                p.NMPRODUTO as PRODUCT_NAME
            from IXLEQUIPAMENTO eq
            left join IPRODUTO p on p.CDPRODUTO = eq.CDPRODUTO
            where eq.CDEQUIPAMENTO > ?
            order by eq.CDEQUIPAMENTO
        """
        yield from self._rows(sql, (cursor,))

    def fetch_contracts(self, cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                ct.SEQCONTRATO, ct.NRCONTRATO, ct.CDCLIENTE, ct.STATUS,
                ct.DTCONTRATOINI, ct.DTCONTRATOFIN, ct.TIPOCONTRATO,
                ct.CDCONTRATOTP, tp.NMCONTRATOTP,
                ct.VALOR_TOTAL_CONTRATO, ct.TR_VL_FIXO,
                coalesce(med.VALOR_FRANQUIA, 0) as VALOR_FRANQUIA,
                coalesce(it.QT_EQUIPAMENTOS, 0) as QT_EQUIPAMENTOS,
                ct.TFATENDIMENTO, ct.TF_BLOQUEIA_OS, ct.INCLUSAO, ct.ATUALIZADO
            from IXLCONTRATOS ct
            left join ICLIENTESPRODCONT tp on tp.CDCONTRATOTP = ct.CDCONTRATOTP
            left join (
                select SEQCONTRATO, count(distinct CDEQUIPAMENTO) as QT_EQUIPAMENTOS
                from IXLCONTRATOSIT
                group by SEQCONTRATO
            ) it on it.SEQCONTRATO = ct.SEQCONTRATO
            left join (
                select SEQCONTRATO, sum(coalesce(VALFRANQUIA, 0)) as VALOR_FRANQUIA
                from IXLCONTRATOSMED
                where coalesce(TFMEDIDORATIVO, 'S') <> 'N'
                group by SEQCONTRATO
            ) med on med.SEQCONTRATO = ct.SEQCONTRATO
            where ct.SEQCONTRATO > ?
            order by ct.SEQCONTRATO
        """
        yield from self._rows(sql, (cursor,))

    def get_receivables_watermark(self) -> int:
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute("select coalesce(max(SEQRECEITA), 0) from IRECEITAS")
            return int(cur.fetchone()[0] or 0)
        finally:
            con.close()

    def fetch_receivables(self, cursor: int, limit: int | None = None) -> Iterator[dict[str, Any]]:
        first = f"first {max(1, int(limit))}" if limit is not None else ""
        sql = f"""
            select {first}
                r.SEQRECEITA, r.CDCLIENTE, r.DTEMISSAOREC, r.DTVECTOREC,
                r.DTPAGTOREC, r.VALRECEITA, r.VALRECEITAPAGA, r.NUMNF,
                r.CDFORMAPAGTO, fp.NMFORMAPAGTO, r.CD_RECEITA_STATUS,
                rs.DS_RECEITA_STATUS, r.SEQCONTRATO, r.SEQIXLCONTRATOS,
                r.SEQIXLCONTRATOSGRP, r.SEQDEMONSTRATIVO
            from IRECEITAS r
            left join IFORMAPAGTO fp on fp.CDFORMAPAGTO = r.CDFORMAPAGTO
            left join IRECEITAS_STATUS rs on rs.ID_RECEITA_STATUS = r.CD_RECEITA_STATUS
            where r.SEQRECEITA > ?
            order by r.SEQRECEITA
        """
        yield from self._rows(sql, (cursor,))

    def fetch_recent_receivables(self, limit: int = 1000) -> Iterator[dict[str, Any]]:
        sql = f"""
            select first {max(1, int(limit))}
                r.SEQRECEITA, r.CDCLIENTE, r.DTEMISSAOREC, r.DTVECTOREC,
                r.DTPAGTOREC, r.VALRECEITA, r.VALRECEITAPAGA, r.NUMNF,
                r.CDFORMAPAGTO, fp.NMFORMAPAGTO, r.CD_RECEITA_STATUS,
                rs.DS_RECEITA_STATUS, r.SEQCONTRATO, r.SEQIXLCONTRATOS,
                r.SEQIXLCONTRATOSGRP, r.SEQDEMONSTRATIVO
            from IRECEITAS r
            left join IFORMAPAGTO fp on fp.CDFORMAPAGTO = r.CDFORMAPAGTO
            left join IRECEITAS_STATUS rs on rs.ID_RECEITA_STATUS = r.CD_RECEITA_STATUS
            order by r.SEQRECEITA desc
        """
        yield from self._rows(sql, ())

    def fetch_open_receivables(self, limit: int = 5000) -> Iterator[dict[str, Any]]:
        sql = f"""
            select first {max(1, int(limit))}
                r.SEQRECEITA, r.CDCLIENTE, r.DTEMISSAOREC, r.DTVECTOREC,
                r.DTPAGTOREC, r.VALRECEITA, r.VALRECEITAPAGA, r.NUMNF,
                r.CDFORMAPAGTO, fp.NMFORMAPAGTO, r.CD_RECEITA_STATUS,
                rs.DS_RECEITA_STATUS, r.SEQCONTRATO, r.SEQIXLCONTRATOS,
                r.SEQIXLCONTRATOSGRP, r.SEQDEMONSTRATIVO
            from IRECEITAS r
            left join IFORMAPAGTO fp on fp.CDFORMAPAGTO = r.CDFORMAPAGTO
            left join IRECEITAS_STATUS rs on rs.ID_RECEITA_STATUS = r.CD_RECEITA_STATUS
            where r.DTPAGTOREC is null
              and coalesce(r.VALRECEITAPAGA, 0) < coalesce(r.VALRECEITA, 0)
            order by r.DTVECTOREC, r.SEQRECEITA
        """
        yield from self._rows(sql, ())

    def fetch_equipment_meters(self, equipment_cursor: int) -> Iterator[dict[str, Any]]:
        sql = """
            select
                m.CDEQUIPAMENTO, e.CDCLIENTE, m.CDMEDIDOR, m.MEDIDOR,
                m.MEDIDORULT, m.DTLEITURA, m.DTLEITURAULT, m.ATUALIZADO
            from IXLEQUIPAMENTOMED m
            join IXLEQUIPAMENTO e on e.CDEQUIPAMENTO = m.CDEQUIPAMENTO
            where m.CDEQUIPAMENTO > ?
            order by m.CDEQUIPAMENTO, m.CDMEDIDOR
        """
        yield from self._rows(sql, (equipment_cursor,))

    def fetch_recent_equipment_meters(self, limit: int = 1000) -> Iterator[dict[str, Any]]:
        sql = f"""
            select first {max(1, int(limit))}
                m.CDEQUIPAMENTO, e.CDCLIENTE, m.CDMEDIDOR, m.MEDIDOR,
                m.MEDIDORULT, m.DTLEITURA, m.DTLEITURAULT, m.ATUALIZADO
            from IXLEQUIPAMENTOMED m
            join IXLEQUIPAMENTO e on e.CDEQUIPAMENTO = m.CDEQUIPAMENTO
            order by m.DTLEITURA desc, m.CDEQUIPAMENTO desc
        """
        yield from self._rows(sql, ())

    def _service_orders_select(self, where_clause: str, limit: int | None = None) -> str:
        first = f"first {max(1, int(limit))}" if limit is not None else ""
        return f"""
            select {first}
                os.CDCLIENTE, os.NMCLIENTE, os.CDEQUIPAMENTO, os.SEQOS,
                os.DTINCLUSAO, os.HRINCLUSAO, os.DTATENDIMENTO, os.HRATENDIMENTO, os.DTFECHAMENTO,
                tp.NMOSTP, st.NMSTATUS, os.STATUS, os.NMSUPORTEA, os.NMSUPORTET, os.NMSUPORTEL,
                os.USUARIO_FECHAMENTO, os.OBSDEFEITOCLI, os.OBSDEFEITOATS,
                os.DEPARTAMENTO, os.LOCALINSTAL, os.CIDADE, os.UF, os.ENDERECO, os.CEP,
                os.DDD, os.FONE, os.CELULAR, os.EMAIL,
                eq.CDPRODUTO as CDPRODUTOE, eq.SERIE, eq.MODELO as MODELOE, eq.FABRICANTE
            from IXLOS os
            left join IXLOSTP tp on tp.CDOSTP = os.CDOSTP
            left join IXLOSSTATUS st on st.CDSTATUS = os.CDSTATUS
            left join IXLEQUIPAMENTO eq on eq.CDEQUIPAMENTO = os.CDEQUIPAMENTO
            where {where_clause}
            order by os.SEQOS
        """

    def fetch_service_orders(
        self,
        cursor: int,
        limit: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        sql = self._service_orders_select("os.SEQOS > ?", limit)
        yield from self._rows(sql, (cursor,))

    def get_service_order_watermarks(self) -> tuple[int, int]:
        """Return current high-water marks without reading O.S. rows."""
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute("select coalesce(max(SEQOS), 0) from IXLOS")
            max_seq_os = int(cur.fetchone()[0] or 0)
            cur.execute(
                "select coalesce(max(ID_ATENDIMENTO), 0) from IXLOSATENDIMENTO"
            )
            max_attendance = int(cur.fetchone()[0] or 0)
            return max_seq_os, max_attendance
        finally:
            try:
                con.close()
            except Exception:
                pass

    def fetch_service_orders_changed_by_attendance(
        self,
        attendance_cursor: int,
        limit: int,
    ) -> tuple[list[dict[str, Any]], int]:
        """Read O.S. touched by new attendance rows using a global integer cursor."""
        con = self.connect()
        try:
            cur = con.cursor()
            cur.execute(
                f"""
                select first {max(1, int(limit))} ID_ATENDIMENTO, SEQOS
                from IXLOSATENDIMENTO
                where ID_ATENDIMENTO > ?
                order by ID_ATENDIMENTO
                """,
                (attendance_cursor,),
            )
            events = cur.fetchall()
        finally:
            try:
                con.close()
            except Exception:
                pass

        if not events:
            return [], attendance_cursor

        max_attendance = max(int(row[0]) for row in events)
        seq_os_values = sorted({int(row[1]) for row in events if row[1] is not None})
        if not seq_os_values:
            return [], max_attendance

        placeholders = ", ".join("?" for _ in seq_os_values)
        sql = self._service_orders_select(
            f"os.SEQOS in ({placeholders})",
        )
        return list(self._rows(sql, tuple(seq_os_values))), max_attendance

    def fetch_os_types(self) -> Iterator[dict[str, Any]]:
        sql = "select CDOSTP, NMOSTP from IXLOSTP"
        yield from self._rows(sql, ())

    def fetch_technicians(self) -> Iterator[dict[str, Any]]:
        sql = "select NMSUPORTE, TFATIVO from IXLOSSUPORTE"
        yield from self._rows(sql, ())

    def fetch_service_order_print_data(self, seq_os: int) -> dict[str, Any]:
        """Read only the small Firebird snapshot required by the A4 form."""
        con = self.connect()
        try:
            cur = con.cursor()

            def fetch_all(sql: str, params: tuple[Any, ...]) -> list[dict[str, Any]]:
                cur.execute(sql, params)
                columns = [str(item[0]).strip().lower() for item in cur.description]
                return [
                    {column: json_safe(value) for column, value in zip(columns, row)}
                    for row in cur.fetchall()
                ]

            def pick(record: dict[str, Any], *fields: str) -> dict[str, Any]:
                return {field: record.get(field) for field in fields if field in record}

            current_rows = fetch_all(
                "select * from IXLOS where SEQOS = ?",
                (seq_os,),
            )
            if not current_rows:
                return {"history": [], "attendances": []}

            current = current_rows[0]
            client_rows = fetch_all(
                "select * from ICLIENTES where CDCLIENTE = ?",
                (current.get("cdcliente"),),
            ) if current.get("cdcliente") else []
            equipment_rows = fetch_all(
                "select * from IXLEQUIPAMENTO where CDEQUIPAMENTO = ?",
                (current.get("cdequipamento"),),
            ) if current.get("cdequipamento") else []
            equipment = equipment_rows[0] if equipment_rows else {}
            contract_id = current.get("seqcontrato") or equipment.get("seqcontrato")
            contract_rows = fetch_all(
                "select * from IXLCONTRATOS where SEQCONTRATO = ?",
                (contract_id,),
            ) if contract_id else []
            contract_group_id = contract_rows[0].get("seqcontratogrp") if contract_rows else None
            contract_group_rows = fetch_all(
                "select * from IXLCONTRATOSGRP where SEQCONTRATOGRP = ?",
                (contract_group_id,),
            ) if contract_group_id else []
            os_type_rows = fetch_all(
                "select * from IXLOSTP where CDOSTP = ?",
                (current.get("cdostp"),),
            ) if current.get("cdostp") else []
            company_rows = fetch_all(
                "select * from IEMPRESA where CDEMPRESA = ?",
                (current.get("cdempresa") or 1,),
            )
            history_rows = fetch_all(
                """
                select first 5
                       os.SEQOS, os.DTINCLUSAO, os.HRINCLUSAO,
                       os.CDEQUIPAMENTO, os.OBSDEFEITOCLI, os.OBSDEFEITOATS,
                       os.NMSUPORTEA, os.NMSUPORTET, os.NMSUPORTEL,
                       os.USUARIO_FECHAMENTO, os.STATUS, tp.NMOSTP
                  from IXLOS os
                  left join IXLOSTP tp on tp.CDOSTP = os.CDOSTP
                 where os.CDCLIENTE = ? and os.SEQOS <> ?
                 order by os.DTINCLUSAO desc, os.HRINCLUSAO desc, os.SEQOS desc
                """,
                (current.get("cdcliente"), seq_os),
            )
            attendance_rows = fetch_all(
                """
                select *
                  from IXLOSATENDIMENTO
                 where SEQOS = ?
                 order by DATAHORA, ID_ATENDIMENTO
                """,
                (seq_os,),
            )
            return {
                "serviceOrder": pick(
                    current,
                    "seqos", "cdcliente", "cdequipamento", "seqcontrato", "cdempresa", "cdostp",
                    "dtinclusao", "hrinclusao", "dtatendimento", "hratendimento", "hratendimento1",
                    "obsdefeitocli", "obsdefeitoats", "nmsuportea", "nmsuportet", "nmsuportel",
                    "usuario_fechamento", "status", "prioridade", "dtpreventrega", "hrpreventrega",
                    "tporcatend", "tpchamado", "tipo_os", "cdterritorio", "departamento", "localinstal",
                    "nmcliente", "endereco", "num", "complemento", "bairro", "cidade", "uf", "cep",
                    "ddd", "fone", "celular", "contato",
                ),
                "client": pick(
                    client_rows[0] if client_rows else {},
                    "cdcliente", "nmcliente", "endereco", "num", "complemento", "bairro", "cidade",
                    "uf", "cep", "cnpj", "cpf", "inscest", "inscmun", "ddd", "fone1", "celular", "contato",
                ),
                "equipment": pick(
                    equipment,
                    "cdequipamento", "modelo", "serie", "patrimonio", "cdcontratotp", "cdterritorio",
                    "departamento", "localinstal", "seqcontrato",
                ),
                "contract": pick(
                    contract_rows[0] if contract_rows else {},
                    "seqcontrato", "nrcontrato", "cdcontratotp", "seqcontratogrp",
                ),
                "contractGroup": pick(
                    contract_group_rows[0] if contract_group_rows else {},
                    "seqcontratogrp", "nmcontratogrp", "cdterritorio",
                ),
                "osType": pick(os_type_rows[0] if os_type_rows else {}, "cdostp", "nmostp"),
                "company": pick(
                    company_rows[0] if company_rows else {},
                    "cdempresa", "nmempresa", "cnpj", "inscest", "endereco", "num", "bairro", "cidade",
                    "uf", "cep", "ddd", "fone", "fone1",
                ),
                "history": history_rows,
                "attendances": attendance_rows,
                "capturedAt": datetime.now().isoformat(timespec="seconds"),
            }
        finally:
            try:
                con.close()
            except Exception:
                pass

    def create_service_order(self, data: dict[str, Any]) -> int:
        cd_cliente = int(data["cdCliente"]) if data.get("cdCliente") else None
        cd_equipamento = int(data["cdEquipamento"]) if data.get("cdEquipamento") else None
        cd_ostp = fit_text(data.get("cdOstp", "02"), 10)

        now = datetime.now()
        dt_inclusao = now.strftime("%Y-%m-%d")
        hr_inclusao = now.strftime("%H:%M")
        
        from datetime import timedelta
        data_prev_entrega = (now + timedelta(days=3)).strftime("%Y-%m-%d")

        status = "E"  # Aberto
        cd_status = "E1"  # Aberto

        defect = str(data.get("defect", "")).strip()
        nmsuportet = fit_text(data.get("nmsuportet", ""), 10)
        attendant_name = fit_text(data.get("attendantName", ""), 10)

        num = None
        if data.get("num"):
            try:
                num = int(data["num"])
            except ValueError:
                pass

        cd_cliente_ent = cd_cliente

        params = (
            cd_cliente,
            cd_cliente_ent,
            cd_equipamento,
            cd_ostp,
            dt_inclusao,
            hr_inclusao,
            status,
            cd_status,
            defect,
            nmsuportet if nmsuportet else attendant_name,
            attendant_name,

            fit_text(data.get("nmCliente", ""), 50),
            fit_text(data.get("endereco", ""), 50),
            num,
            fit_text(data.get("complemento", ""), 30),
            fit_text(data.get("bairro", ""), 30),
            fit_text(data.get("cidade", ""), 40),
            fit_text(data.get("uf", ""), 2),
            fit_text(digits(data.get("cep")), 8),
            fit_text(data.get("ddd", ""), 10),
            fit_text(data.get("fone", ""), 15),
            fit_text(data.get("celular", ""), 15),
            fit_text(data.get("email", ""), 50),
            fit_text(data.get("contato", ""), 20),

            fit_text(data.get("departamento", ""), 45),
            fit_text(data.get("localInstal", ""), 50),
            data_prev_entrega, hr_inclusao,
            fit_text(f"{now.strftime('%d/%m/%Y %H:%M:%S')} CA I", 25)
        )

        sql = """
                insert into IXLOS (
                    SEQOS, CDCLIENTE, CDCLIENTEENT, CDEQUIPAMENTO, CDOSTP, DTINCLUSAO, HRINCLUSAO, STATUS, CDSTATUS, OBSDEFEITOCLI, NMSUPORTET, NMSUPORTEA,
                    NMCLIENTE, ENDERECO, NUM, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, DDD, FONE, CELULAR, EMAIL, CONTATO,
                    DEPARTAMENTO, LOCALINSTAL, DTPREVENTREGA, HRPREVENTREGA, CDEMPRESA, TPORCATEND, TPCHAMADO, CDTERRITORIO, EQUIPCLI, STATUSEQUIP,
                    SEQOSORIGEM, TIPO_OS, TFLIBERADO, CDDEFEITO, PRIORIDADE, ATUALIZADO, FORMULARIOOS, SEQOSCLI, NMSUPORTEL, NR_CAU, NR_RP
                ) values (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, 1, 'A', '1', 'GERAL', 'E', '0',
                    -1, '1', 'S', 'MAN', '24', ?, '', '', '', '', ''
                )
            """

        # O Desktop numera IXLOS pelo maior SEQOS real. O contador
        # ORDEMSERVICO pode ficar atrasado e devolver uma chave ja ocupada.
        # Em caso de concorrencia, refazemos a leitura e tentamos novamente.
        for attempt in range(1, 4):
            con = self.connect()
            try:
                cur = con.cursor()
                cur.execute("SELECT COALESCE(MAX(SEQOS), 0) + 1 FROM IXLOS")
                row = cur.fetchone()
                if not row or row[0] is None:
                    raise RuntimeError("Nao foi possivel consultar o proximo SEQOS.")
                seq_os = int(row[0])
                logging.info("Inserindo com o proximo SEQOS livre: %s", seq_os)
                cur.execute(sql, (seq_os,) + params)
                con.commit()
                return seq_os
            except Exception as exc:
                con.rollback()
                if attempt < 3 and is_duplicate_key_error(exc):
                    logging.warning(
                        "SEQOS ocupado durante a gravacao; recalculando (tentativa %s/3).",
                        attempt + 1,
                    )
                    continue
                raise
            finally:
                try:
                    con.close()
                except Exception:
                    pass

        raise RuntimeError("Nao foi possivel reservar um SEQOS livre apos 3 tentativas.")


def normalize_contact(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["cdcliente"]).strip()
    phone = normalize_phone(
        compose_brazil_phone(record.get("ddd"), record.get("celular")),
        compose_brazil_phone(record.get("ddd"), record.get("fone1")),
        record.get("celular"),
        record.get("fone1"),
        record.get("fone2"),
    ) or f"FB-{external_id}"

    # Format full address: "Street, Number - Complement - Neighborhood"
    street = first_non_empty(record.get("endereco"))
    num = first_non_empty(record.get("num"))
    complement = first_non_empty(record.get("complemento"))
    bairro = first_non_empty(record.get("bairro"))

    addr_parts = []
    if street:
        if num:
            addr_parts.append(f"{street}, {num}")
        else:
            addr_parts.append(street)
    elif num:
        addr_parts.append(num)

    if complement:
        addr_parts.append(complement)
    if bairro:
        addr_parts.append(bairro)

    address_str = " - ".join(addr_parts) if addr_parts else None

    return {
        "externalId": external_id,
        "cdCliente": external_id,
        "name": first_non_empty(record.get("nmcliente"), record.get("fantasia")) or f"Cliente {external_id}",
        "fantasyName": first_non_empty(record.get("fantasia")),
        "phone": phone,
        "email": first_non_empty(record.get("email")),
        "cpfCnpj": first_non_empty(record.get("cpf"), record.get("cnpj")),
        "address": address_str,
        "neighborhood": bairro,
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "zipCode": first_non_empty(record.get("cep")),
        "contact": first_non_empty(record.get("contato")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_equipment(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["cdequipamento"]).strip()
    client_external_id = str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None

    # Format full address: "Street, Number - Complement - Neighborhood"
    street = first_non_empty(record.get("endereco"))
    num = first_non_empty(record.get("num"))
    complement = first_non_empty(record.get("complemento"))
    bairro = first_non_empty(record.get("bairro"))

    addr_parts = []
    if street:
        if num:
            addr_parts.append(f"{street}, {num}")
        else:
            addr_parts.append(street)
    elif num:
        addr_parts.append(num)

    if complement:
        addr_parts.append(complement)
    if bairro:
        addr_parts.append(bairro)

    address_str = " - ".join(addr_parts) if addr_parts else None

    return {
        "externalId": external_id,
        "clientExternalId": client_external_id,
        "clientName": None,
        "name": first_non_empty(record.get("modelo"), record.get("fabricante")) or f"Equipamento {external_id}",
        "model": first_non_empty(record.get("modelo")) or f"Equipamento {external_id}",
        "manufacturer": first_non_empty(record.get("fabricante")),
        "serialNumber": first_non_empty(record.get("serie")),
        "type": first_non_empty(record.get("product_name"), record.get("cdproduto")),
        "sector": first_non_empty(record.get("departamento"), record.get("localinstal")),
        "installLocation": first_non_empty(record.get("localinstal")),
        "address": address_str,
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "contact": first_non_empty(record.get("contato")),
        "phone": compose_brazil_phone(record.get("ddd"), record.get("fone")) or normalize_phone(record.get("fone")),
        "contractExternalId": first_non_empty(record.get("seqcontrato")),
        "assetTag": first_non_empty(record.get("patrimonio")),
        "inactive": first_non_empty(record.get("tfinativo")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_contract(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["seqcontrato"]).strip()
    total_value = float(record.get("valor_total_contrato") or 0)
    fixed_value = float(record.get("tr_vl_fixo") or 0)
    franchise_value = float(record.get("valor_franquia") or 0)
    monthly_value = fixed_value + franchise_value
    return {
        "externalId": external_id,
        "clientExternalId": str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None,
        "contractNumber": first_non_empty(record.get("nrcontrato")),
        "status": first_non_empty(record.get("status")),
        "contractType": first_non_empty(record.get("nmcontratotp"), record.get("tipocontrato"), record.get("cdcontratotp")),
        "contractTypeCode": first_non_empty(record.get("cdcontratotp"), record.get("tipocontrato")),
        "value": monthly_value if monthly_value > 0 else total_value,
        "monthlyValue": monthly_value,
        "fixedValue": fixed_value,
        "franchiseValue": franchise_value,
        "totalValue": total_value,
        "equipmentCount": int(record.get("qt_equipamentos") or 0),
        "startsAt": parse_firebird_timestamp(record.get("dtcontratoini")),
        "endsAt": parse_firebird_timestamp(record.get("dtcontratofin")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")),
        "inclusionAt": parse_firebird_timestamp(record.get("inclusao")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_receivable(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["seqreceita"]).strip()
    value = float(record.get("valreceita") or 0)
    paid_value = float(record.get("valreceitapaga") or 0)
    return {
        "externalId": external_id,
        "clientExternalId": str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None,
        "issuedAt": parse_firebird_timestamp(record.get("dtemissaorec")),
        "dueAt": parse_firebird_timestamp(record.get("dtvectorec")),
        "paidAt": parse_firebird_timestamp(record.get("dtpagtorec")),
        "value": value,
        "paidValue": paid_value,
        "openValue": max(0, value - paid_value),
        "invoiceNumber": first_non_empty(record.get("numnf")),
        "paymentMethodCode": first_non_empty(record.get("cdformapagto")),
        "paymentMethod": first_non_empty(record.get("nmformapagto")),
        "statusCode": first_non_empty(record.get("cd_receita_status")),
        "statusLabel": first_non_empty(record.get("ds_receita_status")),
        "contractExternalId": first_non_empty(record.get("seqixlcontratos"), record.get("seqcontrato")),
        "contractGroupExternalId": first_non_empty(record.get("seqixlcontratosgrp")),
        "statementExternalId": first_non_empty(record.get("seqdemonstrativo")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_equipment_meter(record: dict[str, Any]) -> dict[str, Any]:
    equipment_id = str(record["cdequipamento"]).strip()
    meter_code = str(record["cdmedidor"]).strip()
    return {
        "externalId": f"{equipment_id}:{meter_code}",
        "equipmentExternalId": equipment_id,
        "clientExternalId": str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None,
        "meterCode": meter_code,
        "currentValue": float(record.get("medidor") or 0),
        "previousValue": float(record.get("medidorult") or 0),
        "currentReadingAt": parse_firebird_timestamp(record.get("dtleitura")),
        "previousReadingAt": parse_firebird_timestamp(record.get("dtleiturault")),
        "updatedAt": parse_firebird_timestamp(record.get("atualizado")) or parse_firebird_timestamp(record.get("dtleitura")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_service_order(record: dict[str, Any]) -> dict[str, Any]:
    external_id = str(record["seqos"]).strip()
    client_external_id = str(record["cdcliente"]).strip() if record.get("cdcliente") is not None else None
    equipment_external_id = str(record["cdequipamento"]).strip() if record.get("cdequipamento") is not None else None

    return {
        "externalId": external_id,
        "clientExternalId": client_external_id,
        "clientName": first_non_empty(record.get("nmcliente")),
        "equipmentExternalId": equipment_external_id,
        "equipmentModel": first_non_empty(record.get("modeloe")),
        "manufacturer": first_non_empty(record.get("fabricante")),
        "serialNumber": first_non_empty(record.get("serie")),
        "status": first_non_empty(record.get("nmstatus"), record.get("status")),
        "nmSuporteT": first_non_empty(record.get("nmsuportet")),
        "defect": first_non_empty(record.get("obsdefeitocli"), record.get("nmdefeito"), record.get("causa"), record.get("sintoma")),
        "action": first_non_empty(record.get("acao")),
        "observacao": first_non_empty(record.get("observacao"), record.get("obsdefeitoats"), record.get("nmostp")),
        "resolvedAt": parse_firebird_timestamp(record.get("dtfechamento")) or parse_firebird_timestamp(record.get("dtatendimento")),
        "updatedAt": parse_firebird_timestamp(record.get("dtfechamento")) or parse_firebird_timestamp(record.get("dtatendimento")) or parse_firebird_timestamp(record.get("dtinclusao")),
        "address": first_non_empty(record.get("endereco")),
        "city": first_non_empty(record.get("cidade")),
        "state": first_non_empty(record.get("uf")),
        "zipCode": first_non_empty(record.get("cep")),
        "sector": first_non_empty(record.get("departamento"), record.get("localinstal")),
        "phone": compose_brazil_phone(record.get("ddd"), record.get("fone")) or normalize_phone(record.get("fone"), record.get("celular")),
        "raw": {k: json_safe(v) for k, v in record.items()},
    }


def normalize_os_type(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "code": str(record["cdostp"]).strip(),
        "name": str(record["nmostp"]).strip()
    }


def normalize_technician(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(record["nmsuporte"]).strip(),
        "inactive": record.get("tfativo") == "N"
    }


def sync_static_entities(repo: FirebirdRepository, crm: CRMClient) -> None:
    try:
        logging.info("Sincronizando tipos de O.S...")
        os_types = [normalize_os_type(row) for row in repo.fetch_os_types()]
        if os_types:
            crm.push("osTypes", os_types)
            logging.info("Sincronizados %s tipos de O.S.", len(os_types))

        logging.info("Sincronizando técnicos...")
        techs = [normalize_technician(row) for row in repo.fetch_technicians()]
        if techs:
            crm.push("technicians", techs)
            logging.info("Sincronizados %s técnicos.", len(techs))
    except Exception as e:
        logging.error("Falha ao sincronizar entidades estáticas (tipos/técnicos): %s", e)


def sync_entity(
    repo: FirebirdRepository,
    crm: CRMClient,
    state: StateStore,
    entity: str,
    batch_size: int,
    stop_event: threading.Event | None = None,
) -> bool:
    cursor_key = entity
    cursor = state.get_cursor(cursor_key)
    rows: list[dict[str, Any]] = []
    total_sent = 0
    max_cursor = cursor

    if entity == "contacts":
        iterator = repo.fetch_contacts(cursor)
        normalizer = normalize_contact
        cursor_field = "cdcliente"
    elif entity == "equipments":
        iterator = repo.fetch_equipments(cursor)
        normalizer = normalize_equipment
        cursor_field = "cdequipamento"
    elif entity == "contracts":
        iterator = repo.fetch_contracts(cursor)
        normalizer = normalize_contract
        cursor_field = "seqcontrato"
    elif entity == "receivables":
        iterator = repo.fetch_receivables(cursor)
        normalizer = normalize_receivable
        cursor_field = "seqreceita"
    elif entity == "serviceOrders":
        iterator = repo.fetch_service_orders(cursor)
        normalizer = normalize_service_order
        cursor_field = "seqos"
    else:
        raise ValueError(f"Entity desconhecida: {entity}")

    for raw in iterator:
        if stop_event is not None and stop_event.is_set():
            logging.info("%s: sincronizacao interrompida pelo usuario", entity)
            return False
        rows.append(normalizer(raw))

        raw_id = raw.get(cursor_field)
        if raw_id is not None:
            max_cursor = max(max_cursor, int(raw_id))

        if len(rows) >= batch_size:
            crm.push(entity, rows)
            total_sent += len(rows)
            logging.debug("%s: enviado lote de %s registros", entity, len(rows))
            rows.clear()
            state.set_cursor(cursor_key, max_cursor)
            state.set_last_sync_at(datetime.now().isoformat(timespec="seconds"))
            state.save()

    if rows:
        crm.push(entity, rows)
        total_sent += len(rows)
        logging.debug("%s: enviado lote final de %s registros", entity, len(rows))
        rows.clear()
        state.set_cursor(cursor_key, max_cursor)
        state.set_last_sync_at(datetime.now().isoformat(timespec="seconds"))
        state.save()

    logging.info("%s: sincronização concluída, %s registros enviados", entity, total_sent)
    return True


def push_normalized_batches(
    crm: CRMClient,
    entity: str,
    records: Iterator[dict[str, Any]] | list[dict[str, Any]],
    normalizer,
    batch_size: int,
) -> tuple[int, int]:
    batch: list[dict[str, Any]] = []
    total = 0
    max_equipment = 0
    for raw in records:
        batch.append(normalizer(raw))
        if raw.get("cdequipamento") is not None:
            max_equipment = max(max_equipment, int(raw["cdequipamento"]))
        if len(batch) >= batch_size:
            crm.push(entity, batch)
            total += len(batch)
            batch.clear()
    if batch:
        crm.push(entity, batch)
        total += len(batch)
    return total, max_equipment


def sync_crm360_details(
    repo: FirebirdRepository,
    crm: CRMClient,
    state: StateStore,
    batch_size: int,
    force_meter_bootstrap: bool = False,
) -> None:
    receivable_cursor = state.get_cursor("receivables")
    if receivable_cursor <= 0:
        watermark = repo.get_receivables_watermark()
        # A primeira carga traz uma janela recente sem percorrer todo o
        # financeiro historico. Novos titulos seguem pelo cursor normal.
        state.set_cursor("receivables", max(0, watermark - 2000))
        state.save()
    sync_entity(repo, crm, state, "receivables", batch_size)

    meter_cursor = 0 if force_meter_bootstrap else state.get_cursor("equipmentMeters")
    meter_total, max_equipment = push_normalized_batches(
        crm,
        "equipmentMeters",
        repo.fetch_equipment_meters(meter_cursor),
        normalize_equipment_meter,
        batch_size,
    )
    if max_equipment:
        state.set_cursor("equipmentMeters", max_equipment)

    last_refresh_text = state.data.get("crm360_recent_refresh_at")
    try:
        last_refresh = datetime.fromisoformat(last_refresh_text) if last_refresh_text else None
    except ValueError:
        last_refresh = None
    refresh_due = force_meter_bootstrap or not last_refresh or (datetime.now() - last_refresh).total_seconds() >= 3600
    if refresh_due:
        recent_receivables, _ = push_normalized_batches(
            crm, "receivables", repo.fetch_recent_receivables(1000), normalize_receivable, batch_size
        )
        open_receivables, _ = push_normalized_batches(
            crm, "receivables", repo.fetch_open_receivables(5000), normalize_receivable, batch_size
        )
        recent_meters, _ = push_normalized_batches(
            crm, "equipmentMeters", repo.fetch_recent_equipment_meters(1000), normalize_equipment_meter, batch_size
        )
        state.data["crm360_recent_refresh_at"] = datetime.now().isoformat(timespec="seconds")
        logging.info(
            "CRM 360: atualizados %s titulo(s) e %s medidor(es) recentes",
            recent_receivables + open_receivables,
            recent_meters,
        )
    elif meter_total:
        logging.info("CRM 360: %s novo(s) medidor(es) sincronizado(s)", meter_total)
    state.save()


def sync_service_orders_incremental(
    repo: FirebirdRepository,
    crm: CRMClient,
    state: StateStore,
    batch_size: int,
    stop_event: threading.Event | None = None,
) -> bool:
    """Sync a bounded set of new/changed O.S. without scanning IXLOS."""
    if stop_event is not None and stop_event.is_set():
        return False

    recent_bootstrap_size = 250
    cycle_limit = max(25, min(int(batch_size), 100))
    seq_cursor = state.get_cursor("serviceOrders")
    attendance_cursor_exists = "serviceOrderAttendances" in state.data.get("cursors", {})
    attendance_cursor = state.get_cursor("serviceOrderAttendances")

    if seq_cursor <= 0 or not attendance_cursor_exists:
        max_seq_os, max_attendance = repo.get_service_order_watermarks()
        if seq_cursor <= 0:
            # Importa só uma janela recente em uma instalação nova. Os ciclos
            # seguintes concluem essa janela em lotes limitados.
            seq_cursor = max(0, max_seq_os - recent_bootstrap_size)
            state.set_cursor("serviceOrders", seq_cursor)
            # Uma instalação nova também deve saltar os atendimentos antigos.
            attendance_cursor = max_attendance
            state.set_cursor("serviceOrderAttendances", attendance_cursor)
        elif not attendance_cursor_exists:
            # A janela recente já traz o estado atual dessas O.S.; iniciar no
            # MAX evita reproduzir todo o histórico de atendimentos.
            attendance_cursor = max_attendance
            state.set_cursor("serviceOrderAttendances", attendance_cursor)
        state.save()

    new_rows = list(repo.fetch_service_orders(seq_cursor, limit=cycle_limit))
    changed_rows, max_attendance = repo.fetch_service_orders_changed_by_attendance(
        attendance_cursor,
        cycle_limit,
    )

    rows_by_seq: dict[int, dict[str, Any]] = {}
    for raw in new_rows + changed_rows:
        raw_seq = raw.get("seqos")
        if raw_seq is not None:
            rows_by_seq[int(raw_seq)] = raw

    if stop_event is not None and stop_event.is_set():
        return False

    normalized = [
        normalize_service_order(rows_by_seq[seq_os])
        for seq_os in sorted(rows_by_seq)
    ]
    if normalized:
        crm.push("serviceOrders", normalized)

    if new_rows:
        seq_cursor = max(
            seq_cursor,
            max(int(row["seqos"]) for row in new_rows if row.get("seqos") is not None),
        )
    state.set_cursor("serviceOrders", seq_cursor)
    state.set_cursor("serviceOrderAttendances", max_attendance)
    state.set_last_sync_at(datetime.now().isoformat(timespec="seconds"))
    state.save()

    if normalized:
        logging.info(
            "O.S.: %s registro(s) novo(s)/alterado(s) sincronizado(s)",
            len(normalized),
        )
    else:
        logging.debug("O.S.: nenhuma alteração desde o último ciclo")
    return True


def run_cycle(
    config: AppConfig,
    state: StateStore,
    full: bool = False,
    stop_event: threading.Event | None = None,
) -> None:
    repo = FirebirdRepository(config)
    crm = CRMClient(config)
    contract_details_version = 2
    refresh_contract_details = int(state.data.get("contract_details_version", 0) or 0) < contract_details_version

    if full:
        state.data["cursors"] = {
            "contacts": 0,
            "equipments": 0,
            "contracts": 0,
            "serviceOrders": 0,
            "serviceOrderAttendances": 0,
            "receivables": 0,
            "equipmentMeters": 0,
        }
        state.save()
    elif refresh_contract_details:
        # Esta versao passou a trazer valor fixo, franquia e vinculos reais do
        # contrato. Refaz apenas contratos/equipamentos uma vez, preservando a
        # sincronizacao pesada de contatos e O.S.
        state.set_cursor("equipments", 0)
        state.set_cursor("contracts", 0)
        state.set_cursor("equipmentMeters", 0)
        state.save()

    state.data["batch_size"] = config.batch_size

    # Sync static support metadata
    sync_static_entities(repo, crm)

    entities = ["contacts", "equipments", "contracts"]
    if full:
        entities.append("serviceOrders")

    for entity in entities:
        if stop_event is not None and stop_event.is_set():
            return
        logging.info("Iniciando sincronização de %s", entity)
        if not sync_entity(repo, crm, state, entity, config.batch_size, stop_event):
            return

    if refresh_contract_details:
        state.data["contract_details_version"] = contract_details_version
        state.save()
        logging.info("Detalhes de contratos e equipamentos atualizados")

    sync_crm360_details(
        repo,
        crm,
        state,
        config.batch_size,
        force_meter_bootstrap=refresh_contract_details or full,
    )

    if full:
        # A carga completa ja enviou o estado atual de todas as O.S. Portanto,
        # os dois cursores devem partir do topo para que o proximo ciclo nao
        # percorra novamente todo o historico de atendimentos.
        max_seq_os, max_attendance = repo.get_service_order_watermarks()
        state.set_cursor("serviceOrders", max_seq_os)
        state.set_cursor("serviceOrderAttendances", max_attendance)
        state.save()

    if config.sync_service_orders and not full:
        if not sync_service_orders_incremental(
            repo,
            crm,
            state,
            config.batch_size,
            stop_event,
        ):
            return

    # Process billing files
    logging.info("Verificando pasta de cobranças...")
    crm.process_billing_folder()

    # Inform backend that agent is alive
    crm.send_ping()


def run_command_listener(config: AppConfig, stop_event: threading.Event | None = None) -> None:
    """Keep an outbound HTTPS request ready for immediate CRM commands."""
    repo = FirebirdRepository(config)
    crm = CRMClient(config)
    result_store = CommandResultStore(ROOT / "command-results.json")
    logging.info("Listener imediato de comandos iniciado.")

    while stop_event is None or not stop_event.is_set():
        try:
            crm.process_pending_commands(repo, result_store, wait_seconds=25)
        except Exception as exc:
            logging.exception("Falha no listener de comandos: %s", exc)
            time.sleep(2)


def inspect_schema(config: AppConfig) -> Path:
    repo = FirebirdRepository(config)
    report = repo.inspect_schema()
    output_path = ROOT / "schema-report.json"
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    logging.info("Relatorio do schema salvo em %s", output_path)
    return output_path


def configure_logging(config: AppConfig) -> None:
    config.log_dir.mkdir(parents=True, exist_ok=True)
    config.log_file.parent.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, config.log_level.upper(), logging.INFO))
    root_logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    root_logger.addHandler(stream_handler)

    file_handler = RotatingFileHandler(
        config.log_file,
        maxBytes=config.log_max_bytes,
        backupCount=config.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)


def validate_config(config: AppConfig) -> None:
    required = {
        "FIREBIRD_DATABASE": config.firebird_database,
        "CRM_BASE_URL": config.crm_base_url,
        "CRM_TENANT_SLUG": config.crm_tenant_slug,
        "CRM_SYNC_TOKEN": config.crm_sync_token,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(f"Configuração ausente: {', '.join(missing)}")


def validate_firebird_config(config: AppConfig) -> None:
    missing = []
    if not config.firebird_database:
        missing.append("FIREBIRD_DATABASE")
    if missing:
        raise RuntimeError(f"Configuracao ausente: {', '.join(missing)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Firebird to CRM sync client")
    parser.add_argument("--once", action="store_true", help="Executa apenas um ciclo de sincronização")
    parser.add_argument("--full", action="store_true", help="Força ressincronização completa")
    parser.add_argument("--inspect-schema", action="store_true", help="Gera schema-report.json com tabelas, colunas e amostras")
    args = parser.parse_args()

    config = AppConfig.from_env()
    configure_logging(config)
    if args.inspect_schema:
        validate_firebird_config(config)
        inspect_schema(config)
        return

    validate_config(config)

    state = StateStore(config.state_file)

    if args.once:
        run_cycle(config, state, full=args.full)
        CRMClient(config).process_pending_commands(
            FirebirdRepository(config),
            CommandResultStore(ROOT / "command-results.json"),
        )
        return

    logging.info("Client iniciado. Intervalo: %ss", config.sync_interval_seconds)
    command_thread = threading.Thread(
        target=run_command_listener,
        args=(config,),
        name="firebird-command-listener",
        daemon=True,
    )
    command_thread.start()

    while True:
        try:
            run_cycle(config, state, full=args.full)
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            logging.exception("Falha na sincronização: %s", exc)
        time.sleep(max(30, config.sync_interval_seconds))


if __name__ == "__main__":
    main()
