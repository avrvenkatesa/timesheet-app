// src/App.js
import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import "./index.css";

/**
 * Dynamic API base:
 * - Dev with CRA proxy: leave REACT_APP_API_BASE unset -> "/api"
 * - Prod: set REACT_APP_API_BASE="https://api.yourdomain.com/api"
 */
const API = (process.env.REACT_APP_API_BASE || "/api").replace(/\/+$/, "");

const CURRENCIES = ["USD","EUR","GBP","INR","AUD","CAD","JPY","CNY","SGD","CHF"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function App() {
  // ---------- State ----------
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [invoiceInfo, setInvoiceInfo] = useState({
    from: { name: "", address: "", email: "", phone: "" },
    to:   { name: "", address: "", email: "", phone: "" }
  });

  // forms
  const [projForm, setProjForm] = useState({ name: "", currency: "USD", rate: "" });
  const [phaseForm, setPhaseForm] = useState({ projectId: "", name: "" });
  const [taskForm,  setTaskForm]  = useState({ projectId: "", phaseId: "", name: "", billable: true });
  const [entryForm, setEntryForm] = useState({ date:"", projectId:"", phaseId:"", taskId:"", taskName:"", taskBillable:false, hours:"", notes:"" });

  // for inline edits
  const [edit, setEdit] = useState({ projectId:null, phaseId:null, taskId:null });

  // ---------- Initial load from API ----------
  useEffect(() => {
    (async () => {
      try {
        const [p,e,i] = await Promise.all([
          fetch(`${API}/projects`).then(r=>r.json()),
          fetch(`${API}/entries`).then(r=>r.json()),
          fetch(`${API}/invoice`).then(r=>r.json()),
        ]);
        setProjects(p || []);
        setEntries(e || []);
        setInvoiceInfo(i || { from:{}, to:{} });
      } catch (err) {
        console.error("Failed to load from server:", err);
        alert("Could not load data from server. Is the backend running on :4000?");
      }
    })();
  }, []);

  // ---------- Helpers ----------
  const getProject = (id) => projects.find(p => p.id === id);
  const getPhase   = (p, phaseId) => (p?.phases || []).find(ph => ph.id === phaseId);
  const getTask    = (p, phaseId, taskId) => {
    if (!p) return null;
    if (phaseId) return getPhase(p, phaseId)?.tasks?.find(t => t.id === taskId) || null;
    return (p.tasks || []).find(t => t.id === taskId) || null;
  };

  async function refreshProjects() { setProjects(await (await fetch(`${API}/projects`)).json()); }
  async function refreshEntries()  { setEntries(await (await fetch(`${API}/entries`)).json()); }

  // ---------- API: create ----------
  async function apiAddProject({ name, currency, rate }) {
    const res = await fetch(`${API}/projects`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ name, currency, rate }),
    });
    const created = await res.json();
    setProjects(prev => [...prev, created]);
  }

  async function apiAddPhase({ projectId, name }) {
    await fetch(`${API}/phases`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ projectId, name })
    });
    await refreshProjects();
  }

  async function apiAddTask({ projectId, phaseId, name, billable }) {
    await fetch(`${API}/tasks`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ projectId, phaseId: phaseId || null, name, billable })
    });
    await refreshProjects();
  }

  async function apiAddEntry(e) {
    const res = await fetch(`${API}/entries`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(e)
    });
    const created = await res.json();
    setEntries(prev => [created, ...prev]);
  }

  async function apiImportEntries(list) {
    await fetch(`${API}/entries/import`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(list)
    });
    await refreshEntries();
  }

  async function apiSaveInvoice(info) {
    await fetch(`${API}/invoice`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(info)
    });
    setInvoiceInfo(info);
  }

  // ---------- API: update/delete ----------
  async function apiUpdateProject(id, data) {
    await fetch(`${API}/projects/${id}`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });
    await refreshProjects();
  }

  async function apiDeleteProject(id) {
    await fetch(`${API}/projects/${id}`, { method:"DELETE" });
    await refreshProjects();
    await refreshEntries();
  }

  async function apiUpdatePhase(id, data) {
    await fetch(`${API}/phases/${id}`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });
    await refreshProjects();
  }

  async function apiDeletePhase(id) {
    await fetch(`${API}/phases/${id}`, { method:"DELETE" });
    await refreshProjects();
    await refreshEntries();
  }

  async function apiUpdateTask(id, data) {
    await fetch(`${API}/tasks/${id}`, {
      method:"PUT", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(data)
    });
    await refreshProjects();
  }

  async function apiDeleteTask(id) {
    await fetch(`${API}/tasks/${id}`, { method:"DELETE" });
    await refreshProjects();
    await refreshEntries();
  }

  async function apiDeleteEntry(id) {
    await fetch(`${API}/entries/${id}`, { method:"DELETE" });
    await refreshEntries();
  }

  // ---------- UI: create handlers ----------
  async function addProject() {
    if (!projForm.name?.trim()) return alert("Project name required");
    await apiAddProject({ name: projForm.name.trim(), currency: projForm.currency, rate: Number(projForm.rate || 0) });
    setProjForm({ name:"", currency:"USD", rate:"" });
  }

  async function addPhase() {
    if (!phaseForm.projectId || !phaseForm.name?.trim()) return alert("Pick project and enter phase name");
    await apiAddPhase({ projectId: phaseForm.projectId, name: phaseForm.name.trim() });
    setPhaseForm({ projectId:"", name:"" });
  }

  async function addTask() {
    if (!taskForm.projectId || !taskForm.name?.trim()) return alert("Pick project and enter task name");
    await apiAddTask({ projectId: taskForm.projectId, phaseId: taskForm.phaseId || null, name: taskForm.name.trim(), billable: !!taskForm.billable });
    setTaskForm({ projectId:"", phaseId:"", name:"", billable:true });
  }

  async function addEntry() {
    if (!entryForm.projectId || (!entryForm.taskId && !entryForm.taskName) || !entryForm.hours) {
      return alert("Complete entry: project, task, hours");
    }
    const p = getProject(entryForm.projectId);
    const phase = p && entryForm.phaseId ? getPhase(p, entryForm.phaseId) : null;
    const t = entryForm.taskId ? getTask(p, entryForm.phaseId, entryForm.taskId) : null;

    const billable = entryForm.taskBillable || (!!t && !!t.billable);
    const hours = Number(entryForm.hours || 0);
    const amount = billable ? Number((hours * Number(p.rate || 0)).toFixed(2)) : 0;

    await apiAddEntry({
      date: entryForm.date || new Date().toISOString().slice(0,10),
      projectId: p.id, phaseId: phase?.id || null, taskId: t?.id || null,
      projectName: p.name, phaseName: phase?.name || "", taskName: t?.name || entryForm.taskName,
      billable, hours, amount, currency: p.currency, notes: entryForm.notes || ""
    });

    setEntryForm({ date:"", projectId:"", phaseId:"", taskId:"", taskName:"", taskBillable:false, hours:"", notes:"" });
  }

  // ---------- CSV export/import ----------
  function exportEntriesCSV() {
    const csv = Papa.unparse(entries.map(e => ({
      date: e.date, project: e.projectName, phase: e.phaseName, task: e.taskName,
      billable: e.billable ? "Yes" : "No", hours: e.hours, amount: e.amount, currency: e.currency, notes: e.notes || ""
    })));
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `time_entries_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function importEntriesCSV(file) {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const rows = (res.data || []).map((r) => {
          const norm = (k) => {
            const key = Object.keys(r).find(kk => kk.toLowerCase() === k.toLowerCase());
            return key ? r[key] : "";
          };
          const date = norm("date") || "";
          const projectName = norm("project") || "";
          const phaseName = norm("phase") || "";
          const taskName = norm("task") || "";
          const billable = ["yes","true","1","y"].includes((norm("billable")||"").toLowerCase());
          const hours = Number(norm("hours") || 0);
          const currency = norm("currency") || "USD";
          const amount = Number(norm("amount") || 0);
          const notes = norm("notes") || "";
          return {
            id: uid(), date, projectId:null, phaseId:null, taskId:null,
            projectName, phaseName, taskName, billable, hours, amount, currency, notes
          };
        });
        await apiImportEntries(rows);
      }
    });
  }

  // ---------- Migrate from old localStorage -> DB (one click) ----------
  async function importFromLocalStorageToDB() {
    const oldProjects = JSON.parse(localStorage.getItem("ts_projects_v3") || "[]");
    const oldEntries  = JSON.parse(localStorage.getItem("ts_entries_v3")  || "[]");
    const oldInvoice  = JSON.parse(localStorage.getItem("ts_invoice_info_v1") || '{"from":{},"to":{}}');

    // create projects/phases/tasks (dedupe by project name)
    for (const p of oldProjects) {
      const curProjects = await (await fetch(`${API}/projects`)).json();
      let exists = curProjects.find(x => x.name === p.name);
      if (!exists) {
        await apiAddProject({ name: p.name, currency: p.currency || "USD", rate: Number(p.rate || p.billingRate || 0) });
        await refreshProjects();
      }
      const proj = (await (await fetch(`${API}/projects`)).json()).find(x => x.name === p.name);

      // phases
      for (const ph of (p.phases || [])) {
        const have = (proj.phases || []).find(x => x.name === ph.name);
        if (!have) await apiAddPhase({ projectId: proj.id, name: ph.name });
        await refreshProjects();
        const proj2 = (await (await fetch(`${API}/projects`)).json()).find(x => x.name === p.name);
        const phase = (proj2.phases || []).find(x => x.name === ph.name);

        // tasks in phase
        for (const t of (ph.tasks || [])) {
          const tHave = (phase.tasks || []).find(x => x.name === t.name);
          if (!tHave) await apiAddTask({ projectId: proj2.id, phaseId: phase.id, name: t.name, billable: !!t.billable });
        }
      }

      // project-level tasks
      const proj3 = (await (await fetch(`${API}/projects`)).json()).find(x => x.name === p.name);
      for (const t of (p.tasks || [])) {
        const have2 = (proj3.tasks || []).find(x => x.name === t.name);
        if (!have2) await apiAddTask({ projectId: proj3.id, phaseId: null, name: t.name, billable: !!t.billable });
      }
      await refreshProjects();
    }

    // entries (best-effort mapping)
    const projs = await (await fetch(`${API}/projects`)).json();
    const rows = oldEntries.map(e => {
      const proj = projs.find(pp => pp.name === (e.projectName || e.project || ""));
      const rate = Number(proj?.rate || 0);
      const billable = !!e.billable;
      const hours = Number(e.hours || 0);
      const amount = billable ? Number((hours * rate).toFixed(2)) : 0;
      return {
        id: uid(),
        date: e.date || "",
        projectId: proj?.id || null,
        phaseId: null, // could try to match by e.phaseName if you kept it
        taskId: null,
        projectName: e.projectName || e.project || "",
        phaseName: e.phaseName || e.phase || "",
        taskName: e.taskName || e.task || "",
        billable,
        hours,
        amount,
        currency: proj?.currency || e.currency || "USD",
        notes: e.notes || "",
      };
    });
    await apiImportEntries(rows);

    await apiSaveInvoice(oldInvoice);
    alert("Imported previous localStorage data into DB.");
  }

 

  // ---------- Invoice generation ----------
  function generateInvoicePDF(projectName) {
    const project = projects.find(p => p.name === projectName);
    if (!project) return alert("Project not found");
    const billableEntries = entries.filter(e => e.projectName === projectName && e.billable);

    const doc = new jsPDF({ unit:"pt", format:"a4" });
    let y=40, left=40; doc.setFontSize(18); doc.text(`Invoice - ${projectName}`, left, y); y+=28;
    doc.setFontSize(11); doc.text("From:", left, y); y+=14;
    ["name","address","email","phone"].forEach(f => invoiceInfo.from[f] && (doc.text(String(invoiceInfo.from[f]), left, y), y+=12));
    let rx=350, ry=68; doc.text("To:", rx, ry); ry+=14;
    ["name","address","email","phone"].forEach(f => invoiceInfo.to[f] && (doc.text(String(invoiceInfo.to[f]), rx, ry), ry+=12));
    y+=8; doc.setFontSize(13); doc.text("Billable items:", left, y); y+=18; doc.setFontSize(11);
    doc.text("Date", left, y); doc.text("Task", left+90, y); doc.text("Hours", left+320, y); doc.text("Rate", left+380, y); doc.text("Amount", left+450, y); y+=14;

    let totalAmt=0, totalH=0;
    billableEntries.forEach(be => {
      const amt = Number(be.amount||0), hrs = Number(be.hours||0);
      doc.text(be.date||"-", left, y);
      doc.text(be.taskName||"-", left+90, y);
      doc.text(hrs.toFixed(2), left+320, y);
      doc.text(`${project.currency} ${Number(project.rate||0).toFixed(2)}`, left+380, y);
      doc.text(`${project.currency} ${amt.toFixed(2)}`, left+450, y);
      totalAmt += amt; totalH += hrs; y+=14;
      if (y>750) { doc.addPage(); y=40; }
    });
    y+=20; doc.setFontSize(12); doc.text(`Total Hours: ${totalH.toFixed(2)}`, left, y); y+=16;
    doc.text(`Total Amount Due: ${project.currency} ${totalAmt.toFixed(2)}`, left, y);
    doc.save(`Invoice_${projectName.replace(/\s+/g,"_")}.pdf`);
  }

  function openPrintableInvoice(projectName) {
    const project = projects.find(p => p.name === projectName);
    if (!project) return alert("Project not found");
    const billableEntries = entries.filter(e => e.projectName === projectName && e.billable);
    const totalH = billableEntries.reduce((s,e)=>s+Number(e.hours||0),0);
    const totalA = billableEntries.reduce((s,e)=>s+Number(e.amount||0),0);
    const esc = (v) => (v||"").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

    const html = `
    <html><head><title>Invoice - ${esc(projectName)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#0f172a}
      .row{display:flex;gap:24px}.box{border:1px solid #e2e8f0;padding:12px;border-radius:6px}
      table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
      h1{color:#0ea5e9}
    </style></head><body>
      <h1>Invoice - ${esc(projectName)}</h1>
      <div class="row">
        <div class="box" style="flex:1"><strong>From</strong><br>${esc(invoiceInfo.from.name)}<br>${esc(invoiceInfo.from.address)}<br>${esc(invoiceInfo.from.email)}<br>${esc(invoiceInfo.from.phone)}</div>
        <div class="box" style="flex:1"><strong>To</strong><br>${esc(invoiceInfo.to.name)}<br>${esc(invoiceInfo.to.address)}<br>${esc(invoiceInfo.to.email)}<br>${esc(invoiceInfo.to.phone)}</div>
      </div>
      <h3>Project: ${esc(projectName)}</h3><p>Currency: ${esc(project.currency)} · Rate: ${esc(project.rate)}</p>
      <table><thead><tr><th>Date</th><th>Task</th><th>Hours</th><th>Amount</th></tr></thead>
      <tbody>
        ${billableEntries.map(e=>`<tr><td>${esc(e.date||"")}</td><td>${esc(e.taskName)}</td><td>${Number(e.hours).toFixed(2)}</td><td>${esc(e.currency)} ${Number(e.amount).toFixed(2)}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr><td colspan="2"><strong>Totals</strong></td><td><strong>${totalH.toFixed(2)}</strong></td><td><strong>${esc(project.currency)} ${totalA.toFixed(2)}</strong></td></tr></tfoot>
      </table>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
    const w = window.open("", "_blank"); w.document.write(html); w.document.close();
  }

  // ---------- Delete (UI handlers) ----------
const deleteProject = (id) => { if (window.confirm("Delete project and all related data?")) apiDeleteProject(id); };
const deletePhase   = (phid) => { if (window.confirm("Delete phase and its tasks/entries?")) apiDeletePhase(phid); };
const deleteTask    = (tid)  => { if (window.confirm("Delete task and its entries?")) apiDeleteTask(tid); };
const deleteEntry   = (id)   => { if (window.confirm("Delete this time entry?")) apiDeleteEntry(id); };
  

  // ---------- Totals (footer) ----------
  const totals = useMemo(() => {
    let billableH=0, nonBillableH=0; const byCur = {};
    entries.forEach(e => {
      if (e.billable) {
        billableH += Number(e.hours||0);
        byCur[e.currency||"USD"] = (byCur[e.currency||"USD"]||0) + Number(e.amount||0);
      } else nonBillableH += Number(e.hours||0);
    });
    return { billableH, nonBillableH, byCur };
  }, [entries]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-white text-slate-900 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">Timesheet (SQLite)</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">API: {API}</span>
          <button className="border px-3 py-1 rounded" onClick={exportEntriesCSV}>Export CSV</button>
          <label className="border px-3 py-1 rounded cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e)=>importEntriesCSV(e.target.files?.[0])}/>
          </label>
          <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={importFromLocalStorageToDB}>Import localStorage → DB</button>
        </div>
      </header>

      {/* Create Project */}
      <section className="bg-blue-50 border border-blue-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-700">Create Project</h2>
        <div className="flex gap-2 mt-2 flex-wrap">
          <input className="border p-2 rounded flex-1 min-w-[180px]" placeholder="Project name"
                 value={projForm.name} onChange={(e)=>setProjForm({...projForm, name:e.target.value})}/>
          <select className="border p-2 rounded w-40" value={projForm.currency}
                  onChange={(e)=>setProjForm({...projForm, currency:e.target.value})}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="border p-2 rounded w-40" placeholder="Rate per hour" type="number"
                 value={projForm.rate} onChange={(e)=>setProjForm({...projForm, rate:e.target.value})}/>
          <button className="bg-blue-600 text-white px-4 rounded" onClick={addProject}>Add</button>
        </div>
      </section>

      {/* Add Phase */}
      <section className="bg-blue-50 border border-blue-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-700">Add Phase</h2>
        <div className="flex gap-2 mt-2 flex-wrap">
          <select className="border p-2 rounded min-w-[200px]" value={phaseForm.projectId}
                  onChange={(e)=>setPhaseForm({...phaseForm, projectId:e.target.value})}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="border p-2 rounded flex-1 min-w-[180px]" placeholder="Phase name"
                 value={phaseForm.name} onChange={(e)=>setPhaseForm({...phaseForm, name:e.target.value})}/>
          <button className="bg-blue-600 text-white px-4 rounded" onClick={addPhase}>Add Phase</button>
        </div>
      </section>

      {/* Add Task */}
      <section className="bg-blue-50 border border-blue-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-700">Add Task</h2>
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <select className="border p-2 rounded min-w-[200px]" value={taskForm.projectId}
                  onChange={(e)=>setTaskForm({...taskForm, projectId:e.target.value, phaseId:""})}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="border p-2 rounded min-w-[160px]" value={taskForm.phaseId}
                  onChange={(e)=>setTaskForm({...taskForm, phaseId:e.target.value})}
                  disabled={!taskForm.projectId || !getProject(taskForm.projectId)?.phases?.length}>
            <option value="">No Phase</option>
            {taskForm.projectId && getProject(taskForm.projectId)?.phases?.map(ph =>
              <option key={ph.id} value={ph.id}>{ph.name}</option>
            )}
          </select>
          <input className="border p-2 rounded flex-1 min-w-[160px]" placeholder="Task name"
                 value={taskForm.name} onChange={(e)=>setTaskForm({...taskForm, name:e.target.value})}/>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={taskForm.billable}
                   onChange={(e)=>setTaskForm({...taskForm, billable:e.target.checked})}/> Billable
          </label>
          <button className="bg-blue-600 text-white px-4 rounded" onClick={addTask}>Add Task</button>
        </div>
      </section>

      {/* Log Time */}
      <section className="bg-blue-50 border border-blue-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-700">Log Time</h2>
        <div className="flex gap-2 mt-2 flex-wrap items-center">
          <input className="border p-2 rounded w-40" type="date"
                 value={entryForm.date} onChange={(e)=>setEntryForm({...entryForm, date:e.target.value})}/>
          <select className="border p-2 rounded min-w-[200px]" value={entryForm.projectId}
                  onChange={(e)=>setEntryForm({ ...entryForm, projectId:e.target.value, phaseId:"", taskId:"", taskName:"", taskBillable:false })}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="border p-2 rounded min-w-[160px]" value={entryForm.phaseId}
                  onChange={(e)=>setEntryForm({...entryForm, phaseId:e.target.value, taskId:"", taskName:"", taskBillable:false})}
                  disabled={!entryForm.projectId || !getProject(entryForm.projectId)?.phases?.length}>
            <option value="">No Phase</option>
            {entryForm.projectId && getProject(entryForm.projectId)?.phases?.map(ph =>
              <option key={ph.id} value={ph.id}>{ph.name}</option>
            )}
          </select>
          <select className="border p-2 rounded min-w-[200px]" value={entryForm.taskId}
                  onChange={(e)=> {
                    const val = e.target.value; const p = getProject(entryForm.projectId);
                    const t = getTask(p, entryForm.phaseId, val);
                    setEntryForm({...entryForm, taskId: val, taskName: t?.name || "", taskBillable: !!t?.billable});
                  }}
                  disabled={!entryForm.projectId}>
            <option value="">Select existing task</option>
            {(() => {
              const p = getProject(entryForm.projectId); if (!p) return null;
              if (entryForm.phaseId) return getPhase(p, entryForm.phaseId)?.tasks?.map(t => <option key={t.id} value={t.id}>{t.name} {t.billable ? "(B)" : "(NB)"}</option>);
              return p.tasks?.map(t => <option key={t.id} value={t.id}>{t.name} {t.billable ? "(B)" : "(NB)"}</option>);
            })()}
          </select>
          <input className="border p-2 rounded w-48" placeholder="Or type new task" value={entryForm.taskName}
                 onChange={(e)=>setEntryForm({...entryForm, taskName:e.target.value, taskId:""})}/>
          <input className="border p-2 rounded w-28" type="number" min="0" step="0.25" placeholder="Hours"
                 value={entryForm.hours} onChange={(e)=>setEntryForm({...entryForm, hours:e.target.value})}/>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={entryForm.taskBillable}
                   onChange={(e)=>setEntryForm({...entryForm, taskBillable:e.target.checked})}/> Billable
          </label>
          <input className="border p-2 rounded w-48" placeholder="Notes (optional)"
                 value={entryForm.notes || ""} onChange={(e)=>setEntryForm({...entryForm, notes:e.target.value})}/>
          <button className="bg-blue-600 text-white px-4 rounded" onClick={addEntry}>Add Entry</button>
        </div>
      </section>

      {/* Entries Table */}
      <section className="bg-white border border-blue-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold text-blue-700 mb-3">Time Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-blue-50 text-left">
                <th className="border p-2">Date</th>
                <th className="border p-2">Project</th>
                <th className="border p-2">Phase</th>
                <th className="border p-2">Task</th>
                <th className="border p-2">Billable</th>
                <th className="border p-2">Hours</th>
                <th className="border p-2 text-right">Amount</th>
                <th className="border p-2">Notes</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="border p-2">{e.date || "—"}</td>
                  <td className="border p-2">{e.projectName}</td>
                  <td className="border p-2">{e.phaseName || "—"}</td>
                  <td className="border p-2">{e.taskName}</td>
                  <td className="border p-2">{e.billable ? "Yes" : "No"}</td>
                  <td className="border p-2">{Number(e.hours||0).toFixed(2)}</td>
                  <td className="border p-2 text-right">{e.billable ? `${e.currency} ${Number(e.amount||0).toFixed(2)}` : "—"}</td>
                  <td className="border p-2">{e.notes || ""}</td>
                  <td className="border p-2">
                    <button className="text-red-600" onClick={() => deleteEntry(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td className="p-4 text-center text-slate-500" colSpan={9}>No entries yet</td></tr>}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-semibold">
                <td className="border p-2" colSpan={5}>Totals</td>
                <td className="border p-2">{(totals.billableH + totals.nonBillableH).toFixed(2)}</td>
                <td className="border p-2 text-right">
                  {Object.keys(totals.byCur).length
                    ? Object.entries(totals.byCur).map(([c,a]) => `${c} ${a.toFixed(2)}`).join(" · ")
                    : "—"}
                </td>
                <td className="border p-2" colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Projects / Phases / Tasks with edit/delete + invoices */}
      <section className="bg-blue-50 border border-blue-100 p-4 rounded mb-6">
        <h2 className="font-semibold text-blue-700 mb-2">Projects / Phases / Tasks</h2>
        <div className="space-y-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white border p-3 rounded">
              <div className="flex items-center gap-2 flex-wrap">
                {edit.projectId === p.id ? (
                  <>
                    <input className="border p-1 rounded" defaultValue={p.name}
                           onChange={(e)=>p._newName=e.target.value}/>
                    <select className="border p-1 rounded" defaultValue={p.currency}
                            onChange={(e)=>p._newCurrency=e.target.value}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="border p-1 rounded w-28" type="number" defaultValue={p.rate}
                           onChange={(e)=>p._newRate=e.target.value}/>
                    <button className="bg-blue-600 text-white px-2 rounded"
                            onClick={()=>{ apiUpdateProject(p.id, { name: p._newName || p.name, currency: p._newCurrency || p.currency, rate: Number(p._newRate ?? p.rate) }); setEdit({...edit, projectId:null}); }}>
                      Save
                    </button>
                    <button className="border px-2 rounded" onClick={()=>setEdit({...edit, projectId:null})}>Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-slate-600">({p.currency} @ {p.rate}/hr)</div>
                    <button className="border px-2 rounded" onClick={()=>setEdit({...edit, projectId:p.id})}>Edit</button>
                    <button className="text-red-600" onClick={()=>deleteProject(p.id)}>Delete</button>
                    <button className="ml-auto bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>generateInvoicePDF(p.name)}>Generate PDF</button>
                    <button className="border px-3 py-1 rounded" onClick={()=>openPrintableInvoice(p.name)}>Printable</button>
                  </>
                )}
              </div>

              {/* Tasks without phase */}
              {(p.tasks||[]).length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-semibold">Tasks (no phase)</div>
                  {(p.tasks||[]).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      {edit.taskId === t.id ? (
                        <>
                          <input className="border p-1 rounded" defaultValue={t.name} onChange={(e)=>t._newName=e.target.value}/>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" defaultChecked={!!t.billable} onChange={(e)=>t._newBillable=e.target.checked}/> Billable
                          </label>
                          <button className="bg-blue-600 text-white px-2 rounded"
                                  onClick={()=>{ apiUpdateTask(t.id, { name: t._newName || t.name, billable: t._newBillable ?? !!t.billable }); setEdit({...edit, taskId:null}); }}>
                            Save
                          </button>
                          <button className="border px-2 rounded" onClick={()=>setEdit({...edit, taskId:null})}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <div>{t.name} <span className="text-slate-500">{t.billable ? "(Billable)" : "(Non-billable)"}</span></div>
                          <button className="border px-2 rounded" onClick={()=>setEdit({...edit, taskId:t.id})}>Edit</button>
                          <button className="text-red-600" onClick={()=>deleteTask(t.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Phases + tasks */}
              {(p.phases||[]).map(ph => (
                <div key={ph.id} className="mt-3 pl-2 border-l">
                  <div className="flex items-center gap-2 text-sm">
                    {edit.phaseId === ph.id ? (
                      <>
                        <input className="border p-1 rounded" defaultValue={ph.name} onChange={(e)=>ph._newName=e.target.value}/>
                        <button className="bg-blue-600 text-white px-2 rounded"
                                onClick={()=>{ apiUpdatePhase(ph.id, { name: ph._newName || ph.name }); setEdit({...edit, phaseId:null}); }}>
                          Save
                        </button>
                        <button className="border px-2 rounded" onClick={()=>setEdit({...edit, phaseId:null})}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="font-medium">{ph.name}</div>
                        <button className="border px-2 rounded" onClick={()=>setEdit({...edit, phaseId:ph.id})}>Edit</button>
                        <button className="text-red-600" onClick={()=>deletePhase(ph.id)}>Delete</button>
                      </>
                    )}
                  </div>

                  {(ph.tasks||[]).map(t => (
                    <div key={t.id} className="ml-3 flex items-center gap-2 text-sm">
                      {edit.taskId === t.id ? (
                        <>
                          <input className="border p-1 rounded" defaultValue={t.name} onChange={(e)=>t._newName=e.target.value}/>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" defaultChecked={!!t.billable} onChange={(e)=>t._newBillable=e.target.checked}/> Billable
                          </label>
                          <button className="bg-blue-600 text-white px-2 rounded"
                                  onClick={()=>{ apiUpdateTask(t.id, { name: t._newName || t.name, billable: t._newBillable ?? !!t.billable }); setEdit({...edit, taskId:null}); }}>
                            Save
                          </button>
                          <button className="border px-2 rounded" onClick={()=>setEdit({...edit, taskId:null})}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <div>{t.name} <span className="text-slate-500">{t.billable ? "(Billable)" : "(Non-billable)"}</span></div>
                          <button className="border px-2 rounded" onClick={()=>setEdit({...edit, taskId:t.id})}>Edit</button>
                          <button className="text-red-600" onClick={()=>deleteTask(t.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Invoice From / To */}
      <section className="bg-white border border-blue-100 p-4 rounded">
        <h2 className="font-semibold text-blue-700 mb-2">Invoice From / To</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-1">From</h3>
            {["name","address","email","phone"].map(f=>(
              <input key={f} className="border p-2 w-full mb-1" placeholder={f}
                     value={invoiceInfo.from[f] || ""} onChange={(e)=> {
                       const upd = { ...invoiceInfo, from: { ...invoiceInfo.from, [f]: e.target.value } };
                       setInvoiceInfo(upd); apiSaveInvoice(upd);
                     }}/>
            ))}
          </div>
          <div>
            <h3 className="font-medium mb-1">To</h3>
            {["name","address","email","phone"].map(f=>(
              <input key={f} className="border p-2 w-full mb-1" placeholder={f}
                     value={invoiceInfo.to[f] || ""} onChange={(e)=> {
                       const upd = { ...invoiceInfo, to: { ...invoiceInfo.to, [f]: e.target.value } };
                       setInvoiceInfo(upd); apiSaveInvoice(upd);
                     }}/>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
