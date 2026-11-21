# SETUP GUIDE: what to modify and where

## 1. Folder structure

```
doc-ai-project/
├── SETUP.md                      <- this guide
├── backend/                      <- Node/Express server (holds the API key)
│   ├── .env.example              <- COPY to .env and fill in  (STEP A)
│   ├── package.json
│   ├── server.js                 <- the 3 API routes
│   ├── llm.js                    <- LLM connection (Gemma from AI Grid)
│   ├── prompts.js                <- KPI catalog, schema, report + chatbot prompts (YOUR MAIN TUNING FILE)
│   ├── extract-text.js           <- PDF / DOCX / TXT / CSV to text
│   └── news.js                   <- market news for the reports and chatbot
└── frontend/
    └── src/
        └── DocAssistant.jsx      <- React component to copy into your app (STEP C)
```

## 2. Step by step

### STEP A: Backend keys (file: `backend/.env`)

1. In the `backend` folder, copy `.env.example` and rename the copy to `.env`.
2. Open `.env` and replace the values:

| Line | What to write | Where to get it |
|---|---|---|
| `LLM_BASE_URL=` | the API address of AI Grid (OpenAI-compatible, usually ends with `/v1`) | AI Grid dashboard or docs |
| `LLM_API_KEY=` | your AI Grid key | AI Grid dashboard |
| `LLM_MODEL=` | the exact Gemma model name | AI Grid models list |
| `LLM_JSON_MODE=` | keep `true`; set `false` if you get a "response_format" error | |
| `LLM_MERGE_SYSTEM=` | keep `false`; set `true` if you get a "system role not supported" error | |
| `MAX_DOC_CHARS=` | max document size sent to the model; lower it if your Gemma context window is small | |
| `NEWS_API_KEY=` | your news API key | newsapi.org (free key) |
| `FRONTEND_ORIGIN=` | the address of your React app: `http://localhost:5173` for Vite, `http://localhost:3000` for Create React App / Next.js | your dev server |
| `PORT=` | leave `3001` unless it is already used | |

Never put the AI Grid key in the React code. Never commit `.env` (the `.gitignore` already blocks it).

### STEP B: Run the backend

```
cd backend
npm install
npm run dev
```

You should see: `API running on port 3001`.
If you get `Missing LLM_BASE_URL or LLM_MODEL`, `.env` is not filled in or is not in the `backend` folder.

### STEP C: Add the component to your React app

1. Copy `frontend/src/DocAssistant.jsx` into your React project's `src` folder.
2. Open that file. At the top, line `const API = "http://localhost:3001/api";`
   - Keep it for local development.
   - For production, replace it with your deployed backend URL, e.g. `https://api.yourcompany.com/api`.
3. Open your `src/App.jsx` and add the two lines marked below:

```jsx
import DocAssistant from "./DocAssistant";   // <- ADD at the top

function App() {
  return (
    <div>
      <DocAssistant />                        {/* <- ADD where you want it */}
    </div>
  );
}
export default App;
```

4. Start your React app as usual (`npm run dev` or `npm start`).

### STEP D: Connect the data to YOUR dashboard components

In `DocAssistant.jsx`, after the upload, the full dashboard JSON is in `doc.dashboard`. The shape is:

```
doc.dashboard.departments.sales.kpis        -> KPI cards
doc.dashboard.departments.sales.charts      -> charts (type, title, series[{name, data:[{label, value}]}])
doc.dashboard.departments.sales.insights    -> short analyst notes
doc.dashboard.departments.sales.data_gaps   -> KPIs that could not be computed (missing data)
```

The same applies to `production`, `stock`, `procurement`, `finance`.
Cross-department KPIs: `doc.dashboard.cross_department.kpis`.
Alerts: `doc.dashboard.risks_or_alerts`.

Where to write your own UI: replace the `<section>` block in the `departments` loop inside `DocAssistant.jsx` (there is a comment `{/* d.charts[i] ... */}` showing where to plug Recharts or Chart.js).
Reports are in the `reports` state (`reports.sales`, `reports.production`, ...). The chatbot is the input at the bottom.

## 3. Where to change things later

| I want to... | File | What to edit |
|---|---|---|
| Add, remove or rename a KPI or chart | `backend/prompts.js` | the lists inside `KPI_CATALOG` |
| Change the structure of the dashboard data | `backend/prompts.js` | `DASHBOARD_SCHEMA` (and then your React code that reads it) |
| Change how reports are written (sections, tone) | `backend/prompts.js` | `REPORT_SYSTEM` |
| Change chatbot behavior or tone | `backend/prompts.js` | `CHAT_SYSTEM` |
| Change news topics | `backend/server.js` | the line `fetchNews(\`${industry} supply chain OR sales OR market\`)` |
| Change the default industry for news | `backend/server.js` | `"beverage industry"` |
| Use a different news provider | `backend/news.js` | the `fetchNews` function |
| Use another model or LLM provider | `backend/.env` (and `llm.js` if it is not OpenAI-compatible) | `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY` |
| Accept more file types | `backend/extract-text.js` | add a branch in `extractText` |
| Allow bigger documents | `backend/.env` and `backend/server.js` | `MAX_DOC_CHARS`, and the multer `fileSize` limit in `server.js` |

## 4. Limits of this starter (fix before real users)

- **Storage is in memory**: documents and reports vanish when the server restarts. Replace the `store` Map in `server.js` with a database (PostgreSQL / MongoDB).
- **No login or rate limiting**: anyone who can reach the backend can spend your API credits. Add authentication before deploying.
- **Long documents** are cut at `MAX_DOC_CHARS` (24,000 by default). For long files, add chunking + embeddings.
- **Scanned PDFs** return no text. They need OCR (e.g. Tesseract).
- **Gemma is a smaller model**: check the JSON and the KPI numbers more carefully, and use the largest Gemma model your plan offers. The chatbot sends the document, the KPIs and the 5 reports in one request, so a Gemma with a small context window (8k tokens) will fail: lower `MAX_DOC_CHARS` or pick a model with a larger window.
- **Verify the numbers**: the model is told never to invent figures, but check the KPIs against your source documents before using them for decisions.

## 5. Quick test without the frontend

With the backend running:

```
curl -F "file=@yourdocument.pdf" http://localhost:3001/api/documents
```

It returns `{ id, filename, dashboard }`. Then:

```
curl -X POST http://localhost:3001/api/documents/<ID>/reports -H "Content-Type: application/json" -d "{}"
curl -X POST http://localhost:3001/api/documents/<ID>/chat -H "Content-Type: application/json" -d "{\"message\":\"What is the gross margin?\"}"
```
