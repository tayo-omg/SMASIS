// ============================================================
// SmaWaSIS — Complete Frontend Application
// File: src/App.js
// All components in one file for academic submission clarity.
// In production, split into individual component files.
// ============================================================

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ── API BASE ─────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('smawasis_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

// ── AUTH CONTEXT ─────────────────────────────────────────────
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smawasis_user')); } catch { return null; }
  });

  const login = (token, userData) => {
    localStorage.setItem('smawasis_token', token);
    localStorage.setItem('smawasis_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('smawasis_token');
    localStorage.removeItem('smawasis_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ── DESIGN TOKENS / CONSTANTS ─────────────────────────────────
const STATUS_CONFIG = {
  open:        { label: 'Open',        bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  assigned:    { label: 'Assigned',    bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  received:    { label: 'Received',    bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6' },
  in_progress: { label: 'In Progress', bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  cleared:     { label: 'Cleared',     bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
};

// ── SHARED COMPONENTS ─────────────────────────────────────────

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      padding: 24, ...style
    }}>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color = '#16A34A', icon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, color: '#6B7280', fontSize: 13, fontWeight: 500 }}>{label}</p>
          <p style={{ margin: '6px 0 2px', fontSize: 28, fontWeight: 700, color: '#111827' }}>{value ?? '—'}</p>
          {sub && <p style={{ margin: 0, color: '#9CA3AF', fontSize: 12 }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 28, opacity: 0.5 }}>{icon}</span>
      </div>
    </div>
  );
}

function Alert({ type = 'error', message, onDismiss }) {
  const styles = {
    error:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', text: '#14532D' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E3A8A' },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      borderRadius: 8, padding: '12px 16px', marginBottom: 16,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: 14
    }}>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.text, fontSize: 18, padding: 0, marginLeft: 12 }}>×</button>}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style = {}, type = 'button' }) {
  const base = {
    borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 6,
    opacity: disabled ? 0.6 : 1, ...style
  };
  const sizes = { sm: { padding: '6px 14px', fontSize: 13 }, md: { padding: '10px 20px', fontSize: 14 }, lg: { padding: '14px 28px', fontSize: 16 } };
  const variants = {
    primary:   { background: '#16A34A', color: '#fff' },
    secondary: { background: '#F3F4F6', color: '#374151' },
    danger:    { background: '#EF4444', color: '#fff' },
    outline:   { background: 'transparent', color: '#16A34A', border: '1.5px solid #16A34A' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant] }}>
      {children}
    </button>
  );
}

function Input({ label, id, error, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</label>}
      <input
        id={id}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: `1.5px solid ${error ? '#EF4444' : '#D1D5DB'}`,
          fontSize: 14, outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
          fontFamily: 'inherit',
        }}
        {...props}
      />
      {error && <p id={`${id}-error`} style={{ margin: '4px 0 0', color: '#EF4444', fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function Select({ label, id, children, error, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={id} style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</label>}
      <select
        id={id}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: `1.5px solid ${error ? '#EF4444' : '#D1D5DB'}`,
          fontSize: 14, background: '#fff', boxSizing: 'border-box',
          fontFamily: 'inherit', cursor: 'pointer'
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ margin: '4px 0 0', color: '#EF4444', fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );
}

// ── NAVIGATION / LAYOUT ───────────────────────────────────────
function TopNav({ activeTab, setActiveTab, tabs }) {
  const { user, logout } = useAuth();
  const roleColors = { citizen: '#16A34A', contractor: '#0EA5E9', admin: '#8B5CF6' };
  const roleColor = roleColors[user?.role] || '#6B7280';

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32 }}>
          <span style={{ fontSize: 22 }}>♻️</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#16A34A', letterSpacing: '-0.5px' }}>SmaWaSIS</span>
        </div>

        {/* Tabs */}
        <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: activeTab === tab.id ? '#F0FDF4' : 'transparent',
                color: activeTab === tab.id ? '#16A34A' : '#6B7280',
                borderBottom: activeTab === tab.id ? `2px solid #16A34A` : '2px solid transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' }}>{user?.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: roleColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role}</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={logout}>Sign out</Btn>
        </div>
      </div>
    </header>
  );
}

function PageLayout({ children, title, subtitle, action }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            {title && <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>{title}</h1>}
            {subtitle && <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 14 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AUTH SCREENS
// ══════════════════════════════════════════════════════════════
function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen', team_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password, role: form.role, team_id: form.role === 'contractor' && form.team_id ? parseInt(form.team_id) : undefined };

      const data = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      login(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #F0F9FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>♻️</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#16A34A' }}>SmaWaSIS</h1>
          <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: 14 }}>Smart Waste & Sanitation Reporting</p>
        </div>

        <Card>
          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F9FAFB', borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#16A34A' : '#6B7280',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize'
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <Input label="Full Name" id="name" type="text" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
            )}
            <Input label="Email Address" id="email" type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" required />
            <Input label="Password" id="password" type="password" value={form.password} onChange={set('password')} placeholder={mode === 'register' ? 'Min. 6 characters' : ''} required />
            {mode === 'register' && (
              <>
                <Select label="I am a..." id="role" value={form.role} onChange={set('role')}>
                  <option value="citizen">🏘️ Citizen / Reporter</option>
                  <option value="contractor">🔧 Contractor / Field Worker</option>
                  <option value="admin">🛡️ Sanitation Officer (Admin)</option>
                </Select>
                {form.role === 'contractor' && (
                  <Select label="Assigned Team" id="team_id" value={form.team_id} onChange={set('team_id')}>
                    <option value="">Select your ward team...</option>
                    {[1,2,3,4,5].map(i => (
                      <option key={i} value={i}>Ward {i} Sanitation Unit</option>
                    ))}
                  </Select>
                )}
              </>
            )}
            <Btn type="submit" size="lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? <Spinner /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Btn>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, padding: '12px 14px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#374151' }}>
            <strong style={{ color: '#16A34A' }}>Demo Accounts:</strong><br />
            🏘️ citizen@demo.com / demo123<br />
            🔧 contractor@demo.com / demo123 (Team: Ward 2)<br />
            🛡️ admin@demo.com / demo123
          </div>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CITIZEN PORTAL
// ══════════════════════════════════════════════════════════════
function CitizenPortal() {
  const [activeTab, setActiveTab] = useState('report');
  const tabs = [
    { id: 'report', label: 'Report Incident', icon: '📍' },
    { id: 'my-reports', label: 'My Reports', icon: '📋' },
  ];

  return (
    <>
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      {activeTab === 'report' && <ReportForm />}
      {activeTab === 'my-reports' && <MyReports />}
    </>
  );
}

function ReportForm() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category_id: '', latitude: '', longitude: '', address_text: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    apiFetch('/categories').then(setCategories).catch(() => {});
  }, []);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const getGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setError('Could not get GPS location. Please enter coordinates manually or provide an address.');
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id) return setError('Please select an incident category.');
    if (!form.latitude || !form.longitude) return setError('Please provide your location (use GPS button or enter coordinates).');
    setError(''); setLoading(true);

    try {
      const data = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category_id: parseInt(form.category_id),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          address_text: form.address_text,
          description: form.description,
        })
      });
      setSuccess(data);
      setForm({ category_id: '', latitude: '', longitude: '', address_text: '', description: '' });
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageLayout>
        <div style={{ maxWidth: 560, margin: '40px auto' }}>
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h2 style={{ margin: 0, color: '#16A34A', fontWeight: 700 }}>Report Submitted!</h2>
              <p style={{ color: '#6B7280', marginBottom: 24 }}>Your incident has been logged and assigned to a sanitation team.</p>
              <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '16px 24px', marginBottom: 24 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Your Ticket Reference</p>
                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#16A34A', letterSpacing: 1 }}>{success.ticket_ref}</p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#374151' }}>
                  Assigned to: <strong>{success.assigned_team}</strong>
                </p>
              </div>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Save your ticket reference to track the status of this report.</p>
              <Btn onClick={() => setSuccess(null)}>Submit Another Report</Btn>
            </div>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Report an Incident" subtitle="Help keep your community clean. All reports are reviewed by our sanitation team.">
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Card>
          {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit}>
            <Select label="Incident Category *" id="category" value={form.category_id} onChange={set('category_id')} required>
              <option value="">Choose category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} (SLA: {c.sla_hours}h)</option>
              ))}
            </Select>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>Location *</label>
              <Btn variant="outline" size="sm" onClick={getGPS} disabled={gpsLoading} type="button" style={{ marginBottom: 12 }}>
                {gpsLoading ? <Spinner /> : '📍'} {gpsLoading ? 'Getting location...' : 'Use My GPS Location'}
              </Btn>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Latitude" id="lat" type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="e.g. 6.5244" />
                <Input label="Longitude" id="lng" type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="e.g. 3.3792" />
              </div>
              <Input label="Street Address (optional)" id="address" type="text" value={form.address_text} onChange={set('address_text')} placeholder="e.g. 14 Bode Thomas St, Surulere" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label htmlFor="desc" style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>Description (optional)</label>
              <textarea
                id="desc"
                value={form.description}
                onChange={set('description')}
                placeholder="Describe the issue in more detail..."
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB',
                  fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400E' }}>
              📸 <strong>Photo upload:</strong> Photo attachment functionality requires a Cloudinary account configured in the backend .env file.
            </div>

            <Btn type="submit" size="lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Spinner /> : '📨 Submit Report'}
            </Btn>
          </form>
        </Card>
      </div>
    </PageLayout>
  );
}

function MyReports() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    apiFetch('/tickets/mine')
      .then(d => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const viewDetail = async (ticket) => {
    setSelected(ticket);
    setDetailLoading(true);
    try {
      const data = await apiFetch(`/tickets/${ticket.id}`);
      setDetail(data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  if (loading) return <PageLayout><div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading your reports...</div></PageLayout>;

  return (
    <PageLayout title="My Reports" subtitle={`${tickets.length} incident${tickets.length !== 1 ? 's' : ''} reported`}>
      {tickets.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3 style={{ color: '#374151' }}>No reports yet</h3>
          <p style={{ color: '#9CA3AF' }}>Submit your first incident report to get started.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {tickets.map(t => (
            <Card key={t.id} style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }} onClick={() => viewDetail(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <code style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 4 }}>{t.ticket_ref}</code>
                    <StatusPill status={t.status} />
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{t.category}</p>
                  {t.address_text && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>📍 {t.address_text}</p>}
                  {t.assigned_team && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>🏢 {t.assigned_team}</p>}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => { setSelected(null); setDetail(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <code style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>{selected.ticket_ref}</code>
                <div style={{ marginTop: 4 }}><StatusPill status={selected.status} /></div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF' }}>×</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading details...</div>
            ) : detail && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 14 }}>{detail.category}</p>
                  </div>
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned To</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 14 }}>{detail.assigned_team || 'Pending'}</p>
                  </div>
                </div>

                {detail.description && (
                  <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</p>
                    <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{detail.description}</p>
                  </div>
                )}

                {detail.status_history?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#374151' }}>Status History</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {detail.status_history.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                          <span style={{ color: '#374151' }}>{h.from_status ? `${h.from_status} →` : '→'} <strong>{h.to_status}</strong></span>
                          <span style={{ color: '#9CA3AF', marginLeft: 'auto' }}>{new Date(h.changed_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.comments?.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14, color: '#374151' }}>Updates from Sanitation Team</p>
                    {detail.comments.map(c => (
                      <div key={c.id} style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>{c.body}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>{c.author} · {new Date(c.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// CONTRACTOR PORTAL
// ══════════════════════════════════════════════════════════════
function ContractorPortal() {
  const [activeTab, setActiveTab] = useState('tasks');
  const tabs = [
    { id: 'tasks', label: 'My Tasks', icon: '📋' },
  ];
  return (
    <>
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      <ContractorTasks />
    </>
  );
}

function ContractorTasks() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', comment: '' });
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const NEXT_STATUS = { assigned: 'received', received: 'in_progress', in_progress: 'cleared' };

  const load = useCallback(() => {
    apiFetch('/tickets/assigned')
      .then(d => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusForm.status) return;
    setUpdating(true); setUpdateMsg('');
    try {
      await apiFetch(`/tickets/${selected.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusForm.status, comment: statusForm.comment })
      });
      setUpdateMsg('Status updated successfully!');
      setStatusForm({ status: '', comment: '' });
      load();
      setTimeout(() => setSelected(null), 1500);
    } catch (err) {
      setUpdateMsg(`Error: ${err.message}`);
    } finally { setUpdating(false); }
  };

  const filtered = filterStatus ? tickets.filter(t => t.status === filterStatus) : tickets;

  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.status]) acc[t.status] = [];
    acc[t.status].push(t);
    return acc;
  }, {});

  if (loading) return <PageLayout><div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading assigned tickets...</div></PageLayout>;

  return (
    <PageLayout title="My Assigned Tasks" subtitle={`${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} assigned to your team`}
      action={
        <Select id="filter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 180, marginBottom: 0 }}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
        </Select>
      }
    >
      {tickets.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h3 style={{ color: '#374151' }}>All clear!</h3>
          <p style={{ color: '#9CA3AF' }}>No tickets assigned to your team right now.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(t => {
            const nextStatus = NEXT_STATUS[t.status];
            return (
              <Card key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <code style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 4 }}>{t.ticket_ref}</code>
                      <StatusPill status={t.status} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{t.category}</p>
                    {t.address_text && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>📍 {t.address_text}</p>}
                    {t.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}>{t.description}</p>}
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>Reported: {new Date(t.created_at).toLocaleString()}</p>
                  </div>
                  {nextStatus && (
                    <Btn size="sm" onClick={() => { setSelected(t); setStatusForm({ status: nextStatus, comment: '' }); }}>
                      Update Status →
                    </Btn>
                  )}
                  {t.status === 'cleared' && (
                    <span style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>✅ Resolved</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Update Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelected(null)}>
          <Card style={{ maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Update Ticket Status</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF' }}>×</button>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <code style={{ fontSize: 13, color: '#16A34A', fontWeight: 700 }}>{selected.ticket_ref}</code>
              <span style={{ marginLeft: 8 }}><StatusPill status={selected.status} /></span>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#374151' }}>{selected.category} — {selected.address_text}</p>
            </div>

            {updateMsg && <Alert type={updateMsg.startsWith('Error') ? 'error' : 'success'} message={updateMsg} />}

            <form onSubmit={handleStatusUpdate}>
              <Select label="New Status" id="newstatus" value={statusForm.status} onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(NEXT_STATUS).filter(([k]) => k === selected.status).map(([, v]) => (
                  <option key={v} value={v}>{STATUS_CONFIG[v]?.label || v}</option>
                ))}
              </Select>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="upd-comment" style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#374151' }}>Add Comment (optional)</label>
                <textarea
                  id="upd-comment"
                  value={statusForm.comment}
                  onChange={e => setStatusForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="e.g. Team dispatched, clearing in progress..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn type="submit" disabled={updating} style={{ flex: 1, justifyContent: 'center' }}>
                  {updating ? <Spinner /> : 'Confirm Update'}
                </Btn>
                <Btn variant="secondary" onClick={() => setSelected(null)}>Cancel</Btn>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN PORTAL
// ══════════════════════════════════════════════════════════════
function AdminPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'tickets', label: 'All Tickets', icon: '🎫' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];
  return (
    <>
      <TopNav activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'tickets' && <AdminTickets />}
      {activeTab === 'reports' && <AdminReports />}
    </>
  );
}

function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/reports/summary')
      .then(d => { setSummary(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <PageLayout><div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading dashboard...</div></PageLayout>;
  if (!summary) return <PageLayout><Alert type="error" message="Failed to load dashboard data." /></PageLayout>;

  const maxCat = Math.max(...(summary.by_category?.map(c => c.count) || [1]));

  return (
    <PageLayout title="Admin Dashboard" subtitle="Live overview of sanitation incident management">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total Incidents" value={summary.total} icon="📊" color="#16A34A" />
        <KpiCard label="Open / Unassigned" value={summary.by_status.open} icon="🔴" color="#EF4444" />
        <KpiCard label="In Progress" value={summary.by_status.in_progress + summary.by_status.received + summary.by_status.assigned} icon="🔄" color="#F59E0B" />
        <KpiCard label="Cleared" value={summary.by_status.cleared} icon="✅" color="#16A34A" />
        <KpiCard label="Avg Response Time" value={summary.avg_response_hours ? `${summary.avg_response_hours}h` : 'N/A'} icon="⏱️" color="#0EA5E9" />
        <KpiCard label="SLA Compliance" value={summary.sla_compliance_pct != null ? `${summary.sla_compliance_pct}%` : 'N/A'} icon="📋" color={summary.sla_compliance_pct >= 80 ? '#16A34A' : '#EF4444'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* By Category */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Incidents by Category</h3>
          {summary.by_category?.map(c => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#374151' }}>{c.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{c.count}</span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(c.count / maxCat) * 100}%`, height: '100%', background: '#16A34A', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Status Breakdown */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Status Breakdown</h3>
          {Object.entries(summary.by_status).map(([status, count]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
              <StatusPill status={status} />
              <span style={{ fontWeight: 700, color: '#111827' }}>{count}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Top Wards */}
      {summary.top_wards?.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>🔥 Hotspot Wards (by incident volume)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {summary.top_wards.map((w, i) => (
              <div key={w.ward} style={{
                padding: '12px 16px', borderRadius: 8, background: i === 0 ? '#FEF2F2' : '#F9FAFB',
                border: `1px solid ${i === 0 ? '#FECACA' : '#E5E7EB'}`
              }}>
                <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' }}>#{i + 1}</p>
                <p style={{ margin: '2px 0', fontWeight: 700, fontSize: 14, color: '#111827' }}>{w.ward}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: i === 0 ? '#EF4444' : '#16A34A' }}>{w.count}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}

function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category_id: '' });
  const [teams, setTeams] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [assignTeam, setAssignTeam] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
    apiFetch(`/tickets?${params}`)
      .then(d => { setTickets(d.tickets || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch('/categories/teams').then(setTeams).catch(() => {});
  }, []);

  const handleAssign = async () => {
    if (!assignTeam) return;
    setAssigning(true);
    try {
      await apiFetch(`/tickets/${assignModal.id}/assign`, { method: 'PATCH', body: JSON.stringify({ team_id: parseInt(assignTeam) }) });
      setAssignModal(null);
      load();
    } catch (err) {
      alert('Assignment failed: ' + err.message);
    } finally { setAssigning(false); }
  };

  const exportCSV = () => {
    const token = localStorage.getItem('smawasis_token');
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v)));
    window.open(`${API}/reports/export?${params}&token=${token}`, '_blank');
  };

  return (
    <PageLayout title="All Tickets" subtitle={`${total} total incidents`}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="outline" size="sm" onClick={exportCSV}>📥 Export CSV</Btn>
        </div>
      }
    >
      {/* Filters */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 150px' }}>
            <Select id="f-status" label="Status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ marginBottom: 0 }}>
              <option value="">All statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
          <Btn size="sm" variant="secondary" onClick={() => { setFilters({ status: '', category_id: '' }); setPage(1); }}>Clear</Btn>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>Loading tickets...</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {tickets.map(t => (
            <Card key={t.id} style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 4 }}>{t.ticket_ref}</code>
                    <StatusPill status={t.status} />
                    <span style={{ fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>{t.category}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{t.reporter} · {t.address_text || `${t.latitude?.toFixed(4)}, ${t.longitude?.toFixed(4)}`}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(t.created_at).toLocaleString()} · Team: {t.assigned_team || '—'}
                  </p>
                </div>
                {!t.assigned_team && (
                  <Btn size="sm" onClick={() => { setAssignModal(t); setAssignTeam(''); }}>Assign Team</Btn>
                )}
              </div>
            </Card>
          ))}

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Showing {tickets.length} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
              <Btn size="sm" variant="secondary" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setAssignModal(null)}>
          <Card style={{ maxWidth: 420, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Assign Team</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
              Ticket: <code style={{ color: '#16A34A' }}>{assignModal.ticket_ref}</code><br />
              Category: {assignModal.category}
            </p>
            <Select id="assign-team" label="Select Team" value={assignTeam} onChange={e => setAssignTeam(e.target.value)}>
              <option value="">Choose a team...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.ward})</option>)}
            </Select>
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn onClick={handleAssign} disabled={!assignTeam || assigning} style={{ flex: 1, justifyContent: 'center' }}>
                {assigning ? <Spinner /> : 'Confirm Assignment'}
              </Btn>
              <Btn variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}

function AdminReports() {
  const [dates, setDates] = useState({ from: '', to: '' });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dates.from) params.set('from_date', dates.from);
      if (dates.to) params.set('to_date', dates.to);
      const data = await apiFetch(`/reports/summary?${params}`);
      setSummary(data);
    } catch { setSummary(null); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const token = localStorage.getItem('smawasis_token');
    const params = new URLSearchParams();
    if (dates.from) params.set('from_date', dates.from);
    if (dates.to) params.set('to_date', dates.to);
    const url = `${API}/reports/export?${params}`;
    // In a real app, we'd pass the token in a header. For demo, open new tab.
    // The backend would need to handle token via query param or cookie for direct downloads.
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `smawasis_report_${Date.now()}.csv`;
        a.click();
      })
      .catch(() => alert('Export failed'));
  };

  return (
    <PageLayout title="Reports & Analytics" subtitle="Generate and export incident reports">
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Date Range Filter</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <Input label="From Date" id="from" type="date" value={dates.from} onChange={e => setDates(d => ({ ...d, from: e.target.value }))} />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <Input label="To Date" id="to" type="date" value={dates.to} onChange={e => setDates(d => ({ ...d, to: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 16 }}>
            <Btn onClick={fetchSummary} disabled={loading}>{loading ? <Spinner /> : 'Generate Report'}</Btn>
            <Btn variant="outline" onClick={exportCSV}>📥 Export CSV</Btn>
          </div>
        </div>
      </Card>

      {summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <KpiCard label="Total Incidents" value={summary.total} icon="📊" />
            <KpiCard label="Cleared" value={summary.by_status.cleared} icon="✅" color="#16A34A" />
            <KpiCard label="Avg Response (hrs)" value={summary.avg_response_hours ?? 'N/A'} icon="⏱️" color="#0EA5E9" />
            <KpiCard label="SLA Compliance" value={summary.sla_compliance_pct != null ? `${summary.sla_compliance_pct}%` : 'N/A'} icon="📋" color={summary.sla_compliance_pct >= 80 ? '#16A34A' : '#EF4444'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>By Category</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', color: '#6B7280', fontWeight: 600 }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', color: '#6B7280', fontWeight: 600 }}>Count</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', color: '#6B7280', fontWeight: 600 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_category?.map(c => (
                    <tr key={c.name} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 0', color: '#374151' }}>{c.name}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>{c.count}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', color: '#9CA3AF' }}>{summary.total > 0 ? Math.round((c.count / summary.total) * 100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Hotspot Wards</h3>
              {summary.top_wards?.length > 0 ? (
                summary.top_wards.map((w, i) => (
                  <div key={w.ward} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ fontSize: 14, color: '#374151' }}>
                      <strong style={{ color: i === 0 ? '#EF4444' : '#374151' }}>#{i+1}</strong> {w.ward}
                    </span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{w.count} incidents</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#9CA3AF', fontSize: 14 }}>No ward data available for this period.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
function AppContent() {
  const { user } = useAuth();

  if (!user) return <AuthScreen />;
  if (user.role === 'citizen') return <CitizenPortal />;
  if (user.role === 'contractor') return <ContractorPortal />;
  if (user.role === 'admin') return <AdminPortal />;
  return <div style={{ padding: 24 }}>Unknown role: {user.role}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F9FAFB; color: #111827; -webkit-font-smoothing: antialiased; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { border-color: #16A34A !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.15); }
        button:focus-visible { outline: 3px solid #16A34A; outline-offset: 2px; }
      `}</style>
      <AppContent />
    </AuthProvider>
  );
}
