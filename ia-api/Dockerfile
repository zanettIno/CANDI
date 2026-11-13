# CANDI IA API — roda a Lambda (mar2026-API) como um servidor HTTP local
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY mar2026-API/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY mar2026-API/main.py ./main.py
COPY local/server.py ./server.py
EXPOSE 8001
CMD ["python", "server.py"]
