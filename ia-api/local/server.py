"""
Servidor HTTP local que emula a "Function URL" da AWS Lambda da API de IA do CANDI.

O código da Lambda (mar2026-API/main.py) NÃO é alterado: este arquivo apenas recebe
as requisições HTTP, monta o `event` que a Lambda recebia e devolve a resposta no
mesmo formato que a Function URL devolvia (status = statusCode, corpo = body).

    GET  /                                  -> health check  (event = {"path": "/"})
    POST /  {"uid": "<profile_id>"}          -> relatório sob demanda (usado pelo app)
    POST /  {"source": "candi.weekly-scheduler"} -> lote semanal (antes disparado pelo EventBridge)

O acesso ao DynamoDB vai para o DynamoDB Local através da variável
AWS_ENDPOINT_URL_DYNAMODB (suportada nativamente pelo boto3), e a chamada ao
Gemini continua indo para a internet normalmente.
"""

import json
import logging
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [ia-api] %(levelname)s %(message)s")
log = logging.getLogger("ia-api")

PORT = int(os.getenv("PORT", "8001"))

# Importa a Lambda original. Se faltar alguma configuração (ex.: CHAVE_API),
# o servidor sobe mesmo assim e explica o erro em cada requisição.
try:
    import main as lambda_module  # mar2026-API/main.py copiado como main.py

    IMPORT_ERROR = None
except Exception as exc:  # noqa: BLE001
    lambda_module = None
    IMPORT_ERROR = f"{type(exc).__name__}: {exc}"
    log.error("Falha ao carregar a Lambda (verifique CHAVE_API e o .env): %s", IMPORT_ERROR)


class LambdaUrlHandler(BaseHTTPRequestHandler):
    server_version = "CANDI-IA-Local/1.0"

    # ── CORS (necessário para o app rodando no navegador via Expo Web) ──────
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _send(self, status: int, body, content_type: str = "application/json"):
        if not isinstance(body, (str, bytes)):
            body = json.dumps(body, ensure_ascii=False)
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):  # noqa: N802
        self._invoke({"path": "/"})

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            event = json.loads(raw or b"{}")
            if not isinstance(event, dict):
                raise ValueError("o corpo precisa ser um objeto JSON")
        except ValueError as exc:
            self._send(400, {"error": f"JSON inválido: {exc}"})
            return
        self._invoke(event)

    def _invoke(self, event: dict):
        if lambda_module is None:
            self._send(500, {"error": "API de IA não inicializada", "detalhe": IMPORT_ERROR})
            return

        result = lambda_module.lambda_handler(event, None)

        # Mesmo contrato da Function URL: {statusCode, body} vira a resposta HTTP
        if isinstance(result, dict) and "statusCode" in result:
            self._send(int(result["statusCode"]), result.get("body", ""))
        else:
            self._send(200, result)

    def log_message(self, fmt, *args):
        log.info("%s - %s", self.address_string(), fmt % args)


if __name__ == "__main__":
    log.info("API de IA (emulação da Lambda) ouvindo em http://0.0.0.0:%s", PORT)
    ThreadingHTTPServer(("0.0.0.0", PORT), LambdaUrlHandler).serve_forever()
