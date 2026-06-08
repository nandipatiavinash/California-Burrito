import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, NavLink, Route, BrowserRouter as Router, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChefHat,
  Clock3,
  ClipboardList,
  Eye,
  Filter,
  Flame,
  LayoutDashboard,
  MapPin,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
} from 'lucide-react';
import './styles.css';

const categories = ['POS Issue', 'Delivery Delay', 'Inventory', 'Kitchen Equipment', 'Customer Complaint', 'Other'];
const severities = ['Low', 'Medium', 'High', 'Critical'];
const statuses = ['Open', 'In Progress', 'Resolved'];

const emptyForm = {
  title: '',
  description: '',
  category: 'POS Issue',
  storeLocation: '',
  severity: 'Medium',
  status: 'Open',
  createdAt: new Date().toISOString().slice(0, 16),
};

async function api(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 204) return null;
  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { error: responseText || `Request failed with status ${response.status}` };
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
    error.errors = data.errors || {};
    throw error;
  }
  return data;
}

function toInputDate(value) {
  if (!value) return new Date().toISOString().slice(0, 16);
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function Badge({ type, value }) {
  return <span className={`badge ${type}-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
}

function MetricCard({ label, value, icon: Icon, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon"><Icon size={21} strokeWidth={2.4} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function App() {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState('');
  const [updatingStatusIds, setUpdatingStatusIds] = useState(new Set());

  async function loadIncidents() {
    setIsLoading(true);
    try {
      setIncidents(await api('/api/incidents'));
      setApiMessage('');
    } catch {
      setApiMessage('Backend is offline. Start npm run dev:api to load and save incidents.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

  async function createIncident(payload) {
    const created = await api('/api/incidents', { method: 'POST', body: JSON.stringify(payload) });
    setIncidents((current) => [created, ...current]);
    return created;
  }

  async function updateIncident(id, payload) {
    const updated = await api(`/api/incidents/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setIncidents((current) => current.map((incident) => (String(incident.id) === String(id) ? updated : incident)));
    return updated;
  }

  async function updateStatus(id, status) {
    const currentIncident = incidents.find((incident) => String(incident.id) === String(id));
    setUpdatingStatusIds((current) => new Set(current).add(String(id)));
    setIncidents((current) => current.map((incident) => (String(incident.id) === String(id) ? { ...incident, status } : incident)));
    try {
      let updated;
      try {
        updated = await api(`/api/incidents/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      } catch {
        updated = await api(`/api/incidents/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      }
      setIncidents((current) => current.map((incident) => (String(incident.id) === String(id) ? updated : incident)));
      setApiMessage('');
    } catch (error) {
      if (currentIncident) {
        setIncidents((current) => current.map((incident) => (String(incident.id) === String(id) ? currentIncident : incident)));
      }
      setApiMessage(`Could not update status: ${error.message}`);
    } finally {
      setUpdatingStatusIds((current) => {
        const next = new Set(current);
        next.delete(String(id));
        return next;
      });
    }
  }

  async function deleteIncident(id) {
    await api(`/api/incidents/${id}`, { method: 'DELETE' });
    setIncidents((current) => current.filter((incident) => String(incident.id) !== String(id)));
  }

  return (
    <Router>
      <div className="app-shell">
        <TopNav />
        <main className="content">
          {apiMessage && <div className="global-message" role="status">{apiMessage}</div>}
          <Routes>
            <Route path="/" element={<HomePage incidents={incidents} isLoading={isLoading} />} />
            <Route path="/report" element={<ReportPage onSubmit={createIncident} />} />
            <Route path="/incidents" element={<IncidentsPage incidents={incidents} isLoading={isLoading} updatingStatusIds={updatingStatusIds} onStatusChange={updateStatus} />} />
            <Route
              path="/incidents/:id"
              element={<IncidentDetailPage incidents={incidents} onUpdate={updateIncident} onDelete={deleteIncident} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function TopNav() {
  return (
    <nav className="top-nav">
      <Link className="brand" to="/" aria-label="California Burrito Incident Desk">
        <span className="brand-mark"><Flame size={21} fill="currentColor" /></span>
        <span>
          <strong>California Burrito</strong>
          <small>Incident Desk</small>
        </span>
      </Link>
      <div className="nav-actions">
        <NavLink to="/"><LayoutDashboard size={17} />Dashboard</NavLink>
        <NavLink to="/report"><Plus size={17} />Report</NavLink>
        <NavLink to="/incidents"><ClipboardList size={17} />Incidents</NavLink>
      </div>
    </nav>
  );
}

function HomePage({ incidents, isLoading }) {
  const metrics = useMetrics(incidents);
  const active = incidents.filter((incident) => incident.status !== 'Resolved').slice(0, 4);

  return (
    <>
      <section className="hero-band">
        <div>
          <p className="eyebrow"><ChefHat size={16} /> Live operations</p>
          <h1>Keep every restaurant issue moving.</h1>
          <p className="hero-copy">
            A focused incident desk for staff reports, manager triage, store visibility, and fast resolution.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" to="/report"><Plus size={18} /> New incident</Link>
            <Link className="secondary-link" to="/incidents"><Eye size={18} /> View queue</Link>
          </div>
        </div>
        <div className="rush-panel" aria-label="Current service pulse">
          <Flame size={28} />
          <span>Active queue</span>
          <strong>{metrics.open + metrics.inProgress}</strong>
        </div>
      </section>

      <Metrics incidents={incidents} />

      <section className="split-page">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><BarChart3 size={16} /> At a glance</p>
              <h2>Operational mix</h2>
            </div>
          </div>
          <div className="insight-list">
            {severities.map((severity) => {
              const count = incidents.filter((incident) => incident.severity === severity).length;
              return (
                <div className="insight-row" key={severity}>
                  <Badge type="severity" value={severity} />
                  <div className="bar-track"><span style={{ width: `${incidents.length ? (count / incidents.length) * 100 : 0}%` }} /></div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow"><AlertTriangle size={16} /> Needs attention</p>
              <h2>Active incidents</h2>
            </div>
            <Link className="text-link" to="/incidents">See all</Link>
          </div>
          {isLoading ? <EmptyState title="Loading queue..." /> : active.length ? (
            <div className="active-list">
              {active.map((incident) => <IncidentMiniCard key={incident.id} incident={incident} />)}
            </div>
          ) : <EmptyState title="No active incidents" text="All reported issues are resolved." />}
        </div>
      </section>
    </>
  );
}

function Metrics({ incidents }) {
  const metrics = useMetrics(incidents);
  return (
    <section className="metrics-grid" aria-label="Incident metrics">
      <MetricCard label="Total Incidents" value={metrics.total} icon={ClipboardList} tone="total" />
      <MetricCard label="Open Incidents" value={metrics.open} icon={AlertTriangle} tone="open" />
      <MetricCard label="In Progress" value={metrics.inProgress} icon={Clock3} tone="progress" />
      <MetricCard label="Resolved" value={metrics.resolved} icon={CheckCircle2} tone="resolved" />
    </section>
  );
}

function useMetrics(incidents) {
  return useMemo(() => ({
    total: incidents.length,
    open: incidents.filter((incident) => incident.status === 'Open').length,
    inProgress: incidents.filter((incident) => incident.status === 'In Progress').length,
    resolved: incidents.filter((incident) => incident.status === 'Resolved').length,
  }), [incidents]);
}

function ReportPage({ onSubmit }) {
  const navigate = useNavigate();
  return (
    <section className="page-stack">
      <PageHeader eyebrow="New report" title="Submit an incident" copy="Capture the details managers need without slowing down store staff." />
      <IncidentForm
        submitLabel="Submit incident"
        onSubmit={async (payload) => {
          await onSubmit(payload);
          navigate('/incidents');
        }}
      />
    </section>
  );
}

function IncidentsPage({ incidents, isLoading, updatingStatusIds, onStatusChange }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ category: 'All Categories', severity: 'All Severities', status: 'All Statuses' });

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((incident) => incident.title.toLowerCase().includes(query.trim().toLowerCase()))
      .filter((incident) => filters.category === 'All Categories' || incident.category === filters.category)
      .filter((incident) => filters.severity === 'All Severities' || incident.severity === filters.severity)
      .filter((incident) => filters.status === 'All Statuses' || incident.status === filters.status)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filters, incidents, query]);

  return (
    <section className="page-stack">
      <PageHeader eyebrow="Manager queue" title="Incident dashboard" copy="Search, filter, inspect, and update incidents across stores." action={<Link className="primary-link" to="/report"><Plus size={18} /> New incident</Link>} />
      <Metrics incidents={incidents} />
      <section className="panel incidents-panel">
        <div className="section-heading">
          <h2>Incident queue</h2>
          <span className="result-count">{filteredIncidents.length} shown</span>
        </div>
        <Filters query={query} setQuery={setQuery} filters={filters} setFilters={setFilters} />
        {isLoading ? <EmptyState title="Loading incidents..." text="Pulling the latest queue from the backend." /> : (
          <IncidentTable incidents={filteredIncidents} updatingStatusIds={updatingStatusIds} onStatusChange={onStatusChange} />
        )}
      </section>
    </section>
  );
}

function IncidentDetailPage({ incidents, onUpdate, onDelete }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const incident = incidents.find((item) => String(item.id) === String(id));
  const [isEditing, setIsEditing] = useState(false);

  if (!incident) {
    return (
      <section className="page-stack">
        <Link className="text-link" to="/incidents"><ArrowLeft size={16} /> Back to incidents</Link>
        <EmptyState title="Incident not found" text="Refresh the dashboard or choose another incident." />
      </section>
    );
  }

  return (
    <section className="page-stack">
      <Link className="text-link" to="/incidents"><ArrowLeft size={16} /> Back to incidents</Link>
      <PageHeader eyebrow={incident.category} title={incident.title} copy={incident.description} />
      <div className="detail-grid">
        <article className="panel detail-card">
          <div className="detail-kpis">
            <div><span>Severity</span><Badge type="severity" value={incident.severity} /></div>
            <div><span>Status</span><Badge type="status" value={incident.status} /></div>
            <div><span>Store</span><strong>{incident.storeLocation}</strong></div>
            <div><span>Created</span><strong>{formatDate(incident.createdAt)}</strong></div>
          </div>
          <div className="detail-actions">
            <button className="secondary-button" onClick={() => setIsEditing((value) => !value)}><PenLine size={17} /> Edit</button>
            <button
              className="danger-button"
              onClick={async () => {
                await onDelete(incident.id);
                navigate('/incidents');
              }}
            >
              <Trash2 size={17} /> Delete
            </button>
          </div>
        </article>
        {isEditing && (
          <IncidentForm
            initialValue={{ ...incident, createdAt: toInputDate(incident.createdAt) }}
            submitLabel="Save changes"
            includeStatus
            onSubmit={async (payload) => {
              await onUpdate(incident.id, payload);
              setIsEditing(false);
            }}
          />
        )}
      </div>
    </section>
  );
}

function PageHeader({ eyebrow, title, copy, action }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow"><Store size={16} /> {eyebrow}</p>
        <h1>{title}</h1>
        {copy && <p className="hero-copy">{copy}</p>}
      </div>
      {action}
    </header>
  );
}

function IncidentForm({ initialValue = emptyForm, submitLabel, includeStatus = false, onSubmit }) {
  const [form, setForm] = useState(initialValue);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assistantSuggestion, setAssistantSuggestion] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [assistantApplied, setAssistantApplied] = useState(false);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    if (field === 'category' || field === 'severity') setAssistantApplied(false);
  }

  function validate() {
    const nextErrors = {};
    if (form.title.trim().length < 5) nextErrors.title = 'Use at least 5 characters.';
    if (form.description.trim().length < 10) nextErrors.description = 'Use at least 10 characters.';
    if (!form.storeLocation.trim()) nextErrors.storeLocation = 'Store location is required.';
    if (!form.createdAt) nextErrors.createdAt = 'Date and time are required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ ...emptyForm, createdAt: new Date().toISOString().slice(0, 16) });
      setErrors({});
    } catch (error) {
      setErrors(error.errors || { form: 'Could not save this incident.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function suggestIncident() {
    setIsSuggesting(true);
    setErrors((current) => ({ ...current, assistant: '' }));

    try {
      const suggestion = await api('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
        }),
      });
      setAssistantSuggestion(suggestion);
      setForm((current) => ({
        ...current,
        category: suggestion.category,
        severity: suggestion.severity,
      }));
      setAssistantApplied(true);
    } catch (error) {
      setAssistantSuggestion(null);
      setAssistantApplied(false);
      setErrors((current) => ({
        ...current,
        assistant: error.errors?.description || error.message || 'Assistant could not suggest details.',
      }));
    } finally {
      setIsSuggesting(false);
    }
  }

  function applySuggestion() {
    if (!assistantSuggestion) return;
    setForm((current) => ({
      ...current,
      category: assistantSuggestion.category,
      severity: assistantSuggestion.severity,
    }));
    setAssistantApplied(true);
  }

  return (
    <section className="panel form-panel">
      <form onSubmit={submit} noValidate>
        {errors.form && <div className="api-message">{errors.form}</div>}
        <label>
          Incident Title
          <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="e.g. POS terminal not printing receipts" />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </label>
        <label>
          Incident Description
          <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="What happened, who is affected, and what has already been tried?" />
          {errors.description && <span className="field-error">{errors.description}</span>}
        </label>
        <div className="assistant-panel">
          <div>
            <p><Sparkles size={16} /> AI Incident Assistant</p>
            <span>Suggest category, severity, and a manager-ready summary from the report text.</span>
          </div>
          <button className="secondary-button compact-button" type="button" onClick={suggestIncident} disabled={isSuggesting}>
            <Sparkles size={16} /> {isSuggesting ? 'Thinking...' : 'Suggest'}
          </button>
          {errors.assistant && <span className="field-error assistant-error">{errors.assistant}</span>}
          {assistantSuggestion && (
            <div className="assistant-result">
              <div>
                <strong>Category</strong>
                <span className="suggestion-pill">{assistantSuggestion.category}</span>
              </div>
              <div>
                <strong>Severity</strong>
                <Badge type="severity" value={assistantSuggestion.severity} />
              </div>
              <div className="assistant-summary">
                <strong>Summary</strong>
                <span>{assistantSuggestion.summary}</span>
              </div>
              <div className="assistant-summary">
                <strong>Reason</strong>
                <span>{assistantSuggestion.reason}</span>
              </div>
              <button className="primary-button compact-button" type="button" onClick={applySuggestion}>
                {assistantApplied ? 'Applied' : 'Apply suggestion'}
              </button>
              <small>{assistantSuggestion.source}</small>
            </div>
          )}
        </div>
        <div className="form-row">
          <label>Category<select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={(event) => updateForm('severity', event.target.value)}>{severities.map((severity) => <option key={severity}>{severity}</option>)}</select></label>
        </div>
        <div className="form-row">
          <label>
            Store Location
            <input value={form.storeLocation} onChange={(event) => updateForm('storeLocation', event.target.value)} placeholder="Store or area" />
            {errors.storeLocation && <span className="field-error">{errors.storeLocation}</span>}
          </label>
          <label>
            Date and Time
            <input type="datetime-local" value={form.createdAt} onChange={(event) => updateForm('createdAt', event.target.value)} />
            {errors.createdAt && <span className="field-error">{errors.createdAt}</span>}
          </label>
        </div>
        {includeStatus && <label>Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>}
        <button className="primary-button" type="submit" disabled={isSubmitting}><Plus size={18} /> {isSubmitting ? 'Saving...' : submitLabel}</button>
      </form>
    </section>
  );
}

function Filters({ query, setQuery, filters, setFilters }) {
  return (
    <div className="filters">
      <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incident title" /></label>
      <label><Filter size={16} /><select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option>All Categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label><select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}><option>All Severities</option>{severities.map((severity) => <option key={severity}>{severity}</option>)}</select></label>
      <label><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option>All Statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
    </div>
  );
}

function IncidentTable({ incidents, updatingStatusIds, onStatusChange }) {
  if (incidents.length === 0) return <EmptyState title="No incidents match those filters." text="Clear a filter or search for another incident title." />;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Category</th>
            <th>Store</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td data-label="Incident"><strong>{incident.title}</strong><span>{incident.description}</span></td>
              <td data-label="Category">{incident.category}</td>
              <td data-label="Store"><MapPin size={15} /> {incident.storeLocation}</td>
              <td data-label="Severity"><Badge type="severity" value={incident.severity} /></td>
              <td data-label="Status">
                <select
                  className="status-select"
                  value={incident.status}
                  disabled={updatingStatusIds.has(String(incident.id))}
                  onChange={(event) => onStatusChange(incident.id, event.target.value)}
                  aria-label={`Update status for ${incident.title}`}
                >
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <Badge type="status" value={incident.status} />
              </td>
              <td data-label="Created">{formatDate(incident.createdAt)}</td>
              <td data-label="Action"><Link className="icon-link" to={`/incidents/${incident.id}`}><Eye size={16} /> Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentMiniCard({ incident }) {
  return (
    <Link className="mini-card" to={`/incidents/${incident.id}`}>
      <div>
        <strong>{incident.title}</strong>
        <span>{incident.storeLocation}</span>
      </div>
      <Badge type="severity" value={incident.severity} />
    </Link>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <Search size={28} />
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
