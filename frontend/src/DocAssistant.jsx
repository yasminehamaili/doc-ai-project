// Drop-in React example. Your frontend only talks to YOUR backend, never to the LLM directly.
import { useState } from "react";

const API = "http://localhost:3001/api";

export default function DocAssistant() {
  const [doc, setDoc] = useState(null);       // { id, filename, dashboard }
  const [reports, setReports] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API}/documents`, { method: "POST", body: form });
    const data = await res.json();
    setDoc(data);                               // data.dashboard feeds your charts/KPI cards

    const rep = await fetch(`${API}/documents/${data.id}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    setReports((await rep.json()).reports);
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || !doc) return;
    const history = messages;
    setMessages([...history, { role: "user", content: input }]);
    setInput("");

    const res = await fetch(`${API}/documents/${doc.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, history })
    });
    const { answer } = await res.json();
    setMessages((m) => [...m, { role: "assistant", content: answer }]);
  }

  return (
    <div>
      <input type="file" accept=".pdf,.docx,.txt,.csv" onChange={handleUpload} />
      {loading && <p>Analyzing document...</p>}

      {doc && (
        <>
          <h2>{doc.dashboard.document_title}</h2>
          <div>
            {Object.entries(doc.dashboard.departments).map(([dept, d]) => (
              <section key={dept}>
                <h3>{dept}</h3>
                {d.kpis.map((k) => (
                  <div key={k.id}>
                    {k.label}: {k.value} {k.unit}
                    {k.change_pct != null && ` (${k.change_pct}%)`} [{k.status}]
                  </div>
                ))}
                {/* d.charts[i] = { type, title, series } -> feed to Recharts / Chart.js */}
                {d.data_gaps.length > 0 && <small>Missing: {d.data_gaps.join("; ")}</small>}
              </section>
            ))}
          </div>

          {Object.entries(reports).map(([field, text]) => (
            <section key={field}>
              <h3>{field}</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>{text}</pre>
            </section>
          ))}

          <div>
            {messages.map((m, i) => <p key={i}><b>{m.role}:</b> {m.content}</p>)}
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button onClick={send}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
