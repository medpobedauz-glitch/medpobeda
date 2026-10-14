FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates tesseract-ocr && rm -rf /var/lib/apt/lists/*
COPY server/pdf_import/requirements.txt /tmp/pdf-requirements.txt
RUN python3 -m venv /opt/pdf && /opt/pdf/bin/pip install --no-cache-dir -r /tmp/pdf-requirements.txt
COPY --from=build /app /app
ENV NODE_ENV=production PDF_PYTHON=/opt/pdf/bin/python PORT=4000
EXPOSE 4000
CMD ["node", "server/app.js"]
