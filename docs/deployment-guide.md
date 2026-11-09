# AgentShield — Production Deployment Guide (0 to 100)

This guide provides complete, step-by-step instructions to deploy the entire AgentShield stack (PostgreSQL Database, Node.js Backend API, Next.js 15 Frontend Dashboard, and PayPal Sandbox Webhooks) to production with 100% public HTTPS availability.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │                 USER / JUDGES                 │
                      └───────────────────────┬───────────────────────┘
                                              │ HTTPS
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND: VERCEL (Next.js 15 App Router + AG Grid Community v36)                         │
│    URL: https://agentshield.vercel.app                                                      │
│    Env: NEXT_PUBLIC_API_BASE_URL = https://agentshield-api.onrender.com                    │
└─────────────────────────────────────────────┬───────────────────────────────────────────────┘
                                              │ REST API / WebSocket
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. BACKEND: RENDER or RAILWAY (Express 5 + TypeScript + Ed25519 + Groq LLM)                 │
│    URL: https://agentshield-api.onrender.com                                                │
│    Env: DATABASE_URL, FRONTEND_ORIGIN, PAYPAL_CLIENT_ID, GROQ_API_KEY                     │
└──────────────┬──────────────────────────────┬──────────────────────────────┬────────────────┘
               │ Prisma ORM                   │ REST v2                      │ HTTPS Webhooks
               ▼                              ▼                              ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌───────────────────────────┐
│ 3. DATABASE: NEON POSTGRES   │ │ 4. PAYPAL REST API SANDBOX   │ │ 5. GROQ CLOUD API         │
│    Serverless Cloud Postgres │ │    api-m.sandbox.paypal.com  │ │    api.groq.com           │
│    SSL Mode Required         │ │    Orders & Capture          │ │    openai/gpt-oss-20b     │
└──────────────────────────────┘ └──────────────────────────────┘ └───────────────────────────┘
```

---

## Recommended Deployment Path: Neon + Render + Vercel (100% Free Tier Available)

This is the fastest, most reliable, and standard production stack for Next.js + Node + PostgreSQL.

---

### Step 1: Push Code to GitHub

Ensure your local repository is committed and pushed to a GitHub repository:
```bash
git add .
git commit -m "feat: AgentShield v1.5.0 ready for production deployment"
git push origin main
```

---

### Step 2: Provision Cloud PostgreSQL Database (Neon.tech)

1. Go to [https://neon.tech](https://neon.tech) and create a free account (Sign in with GitHub).
2. Click **"Create Project"**:
   - Project Name: `agentshield-db`
   - Postgres Version: `16` (Default)
   - Region: Select region closest to you (e.g., `US East (N. Virginia)` or `Europe (Frankfurt)`).
3. Once created, Neon provides a **Connection String**:
   ```
   postgresql://agentshield_owner:xyz123@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Run Migrations Against the Cloud Database:**
   From your local terminal, apply all Prisma migrations directly to your remote Neon database in one command:
   ```bash
   # On Windows PowerShell:
   $env:DATABASE_URL="postgresql://agentshield_owner:xyz123@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   npx prisma migrate deploy --schema backend/prisma/schema.prisma
   ```
   *(All 4 tables: `Agent`, `PaymentIntent`, `AuditEvent`, and `WebhookEvent` are now live in your cloud database!)*

---

### Step 3: Deploy Backend API to Render (or Railway)

1. Go to [https://render.com](https://render.com) and sign in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your **AgentShield** repository.
4. Configure the Web Service:
   - **Name:** `agentshield-api`
   - **Region:** Same region as Neon (e.g., `Oregon (US West)` or `Frankfurt`).
   - **Branch:** `main`
   - **Root Directory:** *(Leave blank or set to monorepo root)*
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate --schema backend/prisma/schema.prisma && npm run build --workspace backend
     ```
   - **Start Command:**
     ```bash
     node backend/dist/server.js
     ```
   - **Plan Type:** `Free`

5. **Add Environment Variables in Render:**
   Under **Environment Variables**, add:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `4000` | Port for Express listener |
   | `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Your Neon connection string |
   | `FRONTEND_ORIGIN` | `https://agentshield.vercel.app,http://localhost:3000` | Allowed CORS origins (Update once frontend URL is ready) |
   | `PAYPAL_ENV` | `sandbox` | PayPal environment mode |
   | `PAYPAL_CLIENT_ID` | `A...` | Your PayPal Sandbox Client ID |
   | `PAYPAL_CLIENT_SECRET` | `E...` | Your PayPal Sandbox Secret Key |
   | `PAYPAL_WEBHOOK_ID` | `0X...` | (Will be set in Step 5) |
   | `GROQ_API_KEY` | `gsk_...` | Your Groq Cloud API Key |
   | `GROQ_MODEL` | `openai/gpt-oss-20b` | Target Groq LLM model |

6. Click **"Deploy Web Service"**.
7. Once deployment finishes, Render provides your live URL:
   `https://agentshield-api.onrender.com`
8. **Verify Backend Health:**
   Visit `https://agentshield-api.onrender.com/health` in your browser. You should see:
   ```json
   { "ok": true, "service": "agentshield-api", "paypal": "configured" }
   ```

---

### Step 4: Deploy Frontend to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New..."** ➔ **Project**.
3. Select your **AgentShield** repository.
4. In the Configuration screen:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click **Edit** and choose `frontend`.
   - **Build & Output Settings:** Leave default (`next build`).
5. **Add Environment Variable:**

   | Key | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://agentshield-api.onrender.com` |

   *(Ensure there is NO trailing slash `/` at the end of the URL)*

6. Click **"Deploy"**.
7. In ~60 seconds, your frontend will be live at:
   `https://agentshield.vercel.app` (or custom Vercel domain).
8. **Update Backend CORS:**
   Go back to Render ➔ `agentshield-api` ➔ Environment, and ensure `FRONTEND_ORIGIN` includes your exact Vercel URL (e.g. `https://agentshield.vercel.app`).

---

### Step 5: Link PayPal Sandbox Webhook to Live Public HTTPS

Now that your backend has a real public HTTPS URL (`https://agentshield-api.onrender.com`), you can receive real PayPal webhook events without needing ngrok!

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Navigate to **Apps & Credentials** ➔ Select your Sandbox App.
3. Scroll down to the **Webhooks** section and click **"Add Webhook"**.
4. Configure the Webhook:
   - **Webhook URL:** `https://agentshield-api.onrender.com/api/paypal/webhooks`
   - **Event Types:** Select:
     - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
     - `Checkout order approved` (`CHECKOUT.ORDER.APPROVED`)
5. Click **"Save"**.
6. PayPal displays a **Webhook ID** (e.g. `4JH89234KL1290`).
7. Copy this Webhook ID and paste it into Render environment variables as:
   `PAYPAL_WEBHOOK_ID=4JH89234KL1290`
   *(Render will automatically redeploy with the active Webhook ID).*

---

## Alternative: All-in-One Single Dashboard Deployment on Railway

If you prefer deploying everything on one single platform with 1 click:
1. Go to [Railway.app](https://railway.app).
2. Click **"New Project"** ➔ **"Provision PostgreSQL"**.
3. In the same project, click **"New Service"** ➔ **"GitHub Repo"** ➔ Select `AgentShield`.
   - Set Root Directory to `/backend`.
   - Set `DATABASE_URL` to `${{Postgres.DATABASE_URL}}`.
   - Generate public domain: `https://agentshield-backend.up.railway.app`.
4. Add another service ➔ Select `AgentShield`.
   - Set Root Directory to `/frontend`.
   - Set `NEXT_PUBLIC_API_BASE_URL` to `${{backend.RAILWAY_PUBLIC_DOMAIN}}`.
   - Generate public domain: `https://agentshield-frontend.up.railway.app`.

---

## Live Verification & Testing Checklist

Once deployed, run this quick 3-minute smoke test to ensure everything works end-to-end:

- [ ] **1. Gateway Health Check:**
  Open `https://agentshield-api.onrender.com/health` ➔ Confirm `ok: true`.
- [ ] **2. Frontend Dashboard:**
  Open `https://agentshield.vercel.app` ➔ Confirm "Online" and "Sandbox Live" indicators are green.
- [ ] **3. Live Autonomous Agent (Groq LLM):**
  Open `https://agentshield.vercel.app/agent-live`:
  - Click **"Launch Autonomous Agent 🚀"** ➔ Watch all 5 stages complete, Groq formulate \$25.00 GPU purchase, and PayPal Sandbox capture funds.
  - Click **"View in Transaction Ledger"** ➔ Confirm row appears live in the AG Grid.
- [ ] **4. Threat Protection Test:**
  Click **"Simulate Prompt Injection ⚡"** ➔ Confirm AgentShield firewall blocks the rogue \$600 darknet transfer cold (`EXCEEDS_MAX_TRANSACTION`) with \$0.00 loss.
- [ ] **5. Threat Simulation Lab:**
  Open `/threat-demo` ➔ Run Vector 01 (Tampered MITM Payload) ➔ Confirm rejection.
- [ ] **6. Audit Trail & CSV Export:**
  Open `/audit` ➔ Confirm events are logged in AG Grid ➔ Click **"CSV Export"** to test compliance download.
