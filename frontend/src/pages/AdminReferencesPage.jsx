import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { createReference, deleteReference, updateReference } from '../api/adminApi';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';

const TABS = [
  { key: 'subjects', label: 'Предметы', apiType: 'subjects', fields: ['name', 'description'] },
  { key: 'material_types', label: 'Типы', apiType: 'material_types', fields: ['name'] },
  { key: 'courses', label: 'Курсы', apiType: 'courses', fields: ['name', 'number'] },
  { key: 'programs', label: 'Направления', apiType: 'programs', fields: ['code', 'name'] },
];

function ReferenceRow({ item, apiType, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...item });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setLoading(true);
    setError('');
    try {
      const updated = await updateReference(apiType, item.id, form);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Удалить «${item.name}»?`)) return;
    setLoading(true);
    setError('');
    try {
      await deleteReference(apiType, item.id);
      onDeleted(item.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка удаления');
      setLoading(false);
    }
  }

  return (
    <tr>
      {editing ? (
        <>
          <td colSpan={3}>
            <div className="ref-edit-row">
              {Object.keys(form).filter((k) => k !== 'id').map((k) => (
                <input
                  key={k}
                  placeholder={k}
                  value={form[k] || ''}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                />
              ))}
            </div>
            {error && <p className="form-error">{error}</p>}
          </td>
          <td>
            <div className="action-row">
              <button type="button" className="button button--primary" disabled={loading} onClick={save}>
                {loading ? '...' : 'Сохранить'}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td>{item.code ? `${item.code} — ` : ''}{item.name}</td>
          <td>{item.description || item.number || '—'}</td>
          <td>
            {error && <span className="form-error">{error}</span>}
          </td>
          <td>
            <div className="action-row">
              <button type="button" className="button button--ghost" onClick={() => setEditing(true)}>
                Изменить
              </button>
              <button
                type="button"
                className="button button--ghost"
                disabled={loading}
                onClick={remove}
              >
                Удалить
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}

function AddRow({ apiType, tabDef, onAdded }) {
  const emptyForm = Object.fromEntries(tabDef.fields.map((f) => [f, '']));
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    const payload = { ...form };
    if (payload.number !== undefined) payload.number = Number(payload.number);
    try {
      const created = await createReference(apiType, payload);
      onAdded(created);
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <tr>
        <td colSpan={4}>
          <button type="button" className="button button--ghost" onClick={() => setOpen(true)}>
            + Добавить
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={3}>
        <div className="ref-edit-row">
          {tabDef.fields.map((k) => (
            <input
              key={k}
              placeholder={k}
              value={form[k]}
              onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
            />
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}
      </td>
      <td>
        <div className="action-row">
          <button type="button" className="button button--primary" disabled={loading} onClick={submit}>
            {loading ? '...' : 'Создать'}
          </button>
          <button type="button" className="button button--ghost" onClick={() => setOpen(false)}>
            Отмена
          </button>
        </div>
      </td>
    </tr>
  );
}

const AdminReferencesPage = () => {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { subjects, materialTypes, courses, programs, refreshReferenceData } = useReferenceData();
  const [activeTab, setActiveTab] = useState('subjects');
  const [localData, setLocalData] = useState({});

  const isAdmin = user?.role === 'admin';

  if (isAuthLoading) return <section className="page-shell"><p className="profile-muted">Загрузка...</p></section>;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;

  const dataByTab = {
    subjects: localData.subjects ?? subjects,
    material_types: localData.material_types ?? materialTypes,
    courses: localData.courses ?? courses,
    programs: localData.programs ?? programs,
  };

  function handleAdded(tab, item) {
    setLocalData((prev) => ({
      ...prev,
      [tab]: [...(prev[tab] ?? dataByTab[tab]), item],
    }));
    if (refreshReferenceData) refreshReferenceData();
  }

  function handleUpdated(tab, item) {
    setLocalData((prev) => ({
      ...prev,
      [tab]: (prev[tab] ?? dataByTab[tab]).map((x) => (x.id === item.id ? item : x)),
    }));
    if (refreshReferenceData) refreshReferenceData();
  }

  function handleDeleted(tab, id) {
    setLocalData((prev) => ({
      ...prev,
      [tab]: (prev[tab] ?? dataByTab[tab]).filter((x) => x.id !== id),
    }));
    if (refreshReferenceData) refreshReferenceData();
  }

  const currentTab = TABS.find((t) => t.key === activeTab);
  const items = dataByTab[activeTab] || [];

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Администрирование</p>
          <h1 className="page-hero__title">Справочники</h1>
          <p className="hero-copy">CRUD для предметов, типов, курсов и направлений.</p>
        </div>
      </div>

      <div className="surface-card">
        <div className="admin-tab-group" style={{ marginBottom: 'var(--space-md)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin-tab${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({(dataByTab[tab.key] || []).length})
            </button>
          ))}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Доп. поле</th>
              <th></th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ReferenceRow
                key={item.id}
                item={item}
                apiType={currentTab.apiType}
                onUpdated={(updated) => handleUpdated(activeTab, updated)}
                onDeleted={(id) => handleDeleted(activeTab, id)}
              />
            ))}
            <AddRow
              apiType={currentTab.apiType}
              tabDef={currentTab}
              onAdded={(item) => handleAdded(activeTab, item)}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminReferencesPage;
