# Dash Geral — Monitoramento Residencial / Home Monitoring Dashboard

---

## 🇧🇷 Português

Dashboard futurista de monitoramento residencial com design **Cybersecurity/Fluent UI**.
Integra **Pi-hole**, **Home Assistant** e métricas de sistema do **Raspberry Pi** em um painel unificado hospedado na VPS.

### Arquitetura

```
VPS (82.112.245.99)                Raspberry Pi (10.0.0.88)
├── Frontend React (Nginx/Express)    ├── Pi-hole
├── Backend API (Express :3001)       ├── Home Assistant
└── WebSocket Server          ◄──────  └── Relay Agent (Docker)
```

### Pré-requisitos

- **VPS:** Node.js 20+, PM2 (opcional)
- **Raspberry Pi:** CasaOS com Docker, Pi-hole e Home Assistant instalados

### Configuração

1. Clone o repositório na VPS:
```bash
git clone <repo-url> /home/adm_luke/prod/automacao/dash-geral
cd /home/adm_luke/prod/automacao/dash-geral
```

2. Copie e preencha o arquivo de ambiente:
```bash
cp .env.example backend/.env
nano backend/.env
```

Variáveis obrigatórias:
| Variável | Descrição |
|---|---|
| `DASHBOARD_USER` | Usuário para login na dashboard |
| `DASHBOARD_PASSWORD` | Senha para login |
| `JWT_SECRET` | Chave secreta para tokens JWT (mín. 32 chars) |
| `WS_SECRET_KEY` | Chave compartilhada entre VPS e relay agent |
| `HA_ACCESS_TOKEN` | Token de acesso do Home Assistant |
| `PIHOLE_API_TOKEN` | Token API do Pi-hole (opcional) |

3. Instale e faça o build:
```bash
npm run install:all
npm run build
```

4. Inicie:
```bash
npm start
```

### Gerar Token do Home Assistant

1. Acesse `http://10.0.0.88:8123`
2. Perfil (canto inferior esquerdo) → **Long-Lived Access Tokens**
3. **Create Token** → copie e cole no `.env`

### Relay Agent (no Raspberry Pi)

```bash
# No Raspberry Pi via SSH
cd /tmp
git clone <repo-url> dash-geral
cd dash-geral/relay-agent

# Build da imagem Docker
docker build -t dash-relay .

# Executar
docker run -d \
  --name dash-relay \
  --restart unless-stopped \
  --network host \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -e VPS_URL=ws://82.112.245.99:3001/ws/agent \
  -e WS_SECRET_KEY=sua_chave_secreta \
  -e HA_URL=http://localhost:8123 \
  -e HA_TOKEN=seu_token_ha \
  -e PIHOLE_URL=http://localhost/admin/api.php \
  -e PIHOLE_TOKEN=seu_token_pihole \
  dash-relay
```

### Embeder no Home Assistant

1. No HA → Dashboard → Editar → Adicionar Card → **Página web**
2. URL: `http://82.112.245.99:3001`

---

## 🇬🇧 English

Futuristic home monitoring dashboard with **Cybersecurity/Fluent UI** design.
Integrates **Pi-hole**, **Home Assistant**, and **Raspberry Pi** system metrics in a unified panel hosted on a VPS.

### Architecture

```
VPS (82.112.245.99)                Raspberry Pi (10.0.0.88)
├── React Frontend (Nginx/Express)    ├── Pi-hole
├── Backend API (Express :3001)       ├── Home Assistant
└── WebSocket Server          ◄──────  └── Relay Agent (Docker)
```

### Prerequisites

- **VPS:** Node.js 20+, PM2 (optional)
- **Raspberry Pi:** CasaOS with Docker, Pi-hole and Home Assistant installed

### Setup

1. Clone the repository on the VPS:
```bash
git clone <repo-url> /home/adm_luke/prod/automacao/dash-geral
cd /home/adm_luke/prod/automacao/dash-geral
```

2. Copy and fill the environment file:
```bash
cp .env.example backend/.env
nano backend/.env
```

Required variables:
| Variable | Description |
|---|---|
| `DASHBOARD_USER` | Dashboard login username |
| `DASHBOARD_PASSWORD` | Dashboard login password |
| `JWT_SECRET` | JWT secret key (min. 32 chars) |
| `WS_SECRET_KEY` | Shared key between VPS and relay agent |
| `HA_ACCESS_TOKEN` | Home Assistant Long-Lived Access Token |
| `PIHOLE_API_TOKEN` | Pi-hole API token (optional) |

3. Install and build:
```bash
npm run install:all
npm run build
```

4. Start:
```bash
npm start
```

### Generate Home Assistant Token

1. Go to `http://10.0.0.88:8123`
2. Profile (bottom left) → **Long-Lived Access Tokens**
3. **Create Token** → copy and paste in `.env`

### Relay Agent (on Raspberry Pi)

```bash
# On the Raspberry Pi via SSH
cd /tmp
git clone <repo-url> dash-geral
cd dash-geral/relay-agent

# Build Docker image
docker build -t dash-relay .

# Run
docker run -d \
  --name dash-relay \
  --restart unless-stopped \
  --network host \
  -v /proc:/host/proc:ro \
  -v /sys:/host/sys:ro \
  -e VPS_URL=ws://82.112.245.99:3001/ws/agent \
  -e WS_SECRET_KEY=your_secret_key \
  -e HA_URL=http://localhost:8123 \
  -e HA_TOKEN=your_ha_token \
  -e PIHOLE_URL=http://localhost/admin/api.php \
  -e PIHOLE_TOKEN=your_pihole_token \
  dash-relay
```

### Embed in Home Assistant

1. In HA → Dashboard → Edit → Add Card → **Webpage**
2. URL: `http://82.112.245.99:3001`
