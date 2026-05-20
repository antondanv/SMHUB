import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMaterialById, updateMaterial } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';

const MaterialEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subjects, materialTypes, courses, programs } = useReferenceData();

  const [isLoadingMaterial, setIsLoadingMaterial] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    material_type_id: '',
    course_id: '',
    program_id: '',
  });

  useEffect(() => {
    let isActive = true;

    getMaterialById(id)
      .then((material) => {
        if (!isActive) return;

        const canEdit =
          user &&
          (user.id === material.author_id ||
            user.role === 'admin');

        if (!canEdit) {
          navigate(`/materials/${id}`, { replace: true });
          return;
        }

        setForm({
          title: material.title || '',
          description: material.description || '',
          subject_id: String(material.subject_id || ''),
          material_type_id: String(material.material_type_id || ''),
          course_id: String(material.course_id || ''),
          program_id: String(material.program_id || ''),
        });
      })
      .catch((err) => {
        if (isActive) setLoadError(err);
      })
      .finally(() => {
        if (isActive) setIsLoadingMaterial(false);
      });

    return () => {
      isActive = false;
    };
  }, [id, user, navigate]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      subject_id: form.subject_id ? Number(form.subject_id) : undefined,
      material_type_id: form.material_type_id ? Number(form.material_type_id) : undefined,
      course_id: form.course_id ? Number(form.course_id) : undefined,
      program_id: form.program_id ? Number(form.program_id) : undefined,
    };

    try {
      await updateMaterial(id, payload);
      navigate(`/materials/${id}`);
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Ошибка при сохранении');
      setIsSaving(false);
    }
  }

  if (isLoadingMaterial) {
    return (
      <section className="page-shell">
        <div className="catalog-state">
          <p>Загрузка...</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page-shell">
        <div className="empty-state">
          <p>Не удалось загрузить материал.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="page-hero page-hero--compact">
        <div className="page-hero__copy">
          <p className="caps-label">Редактирование</p>
          <h1 className="page-hero__title">Изменить материал</h1>
        </div>
      </div>

      <div className="form-shell">
        <form className="surface-card form-card" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="title">Название</label>
            <input
              id="title"
              name="title"
              type="text"
              maxLength={255}
              required
              value={form.title}
              onChange={handleChange}
            />
          </div>

          <div className="field-group">
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="field-group">
            <label htmlFor="subject_id">Предмет</label>
            <select
              id="subject_id"
              name="subject_id"
              required
              value={form.subject_id}
              onChange={handleChange}
            >
              <option value="">Выберите предмет</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="material_type_id">Тип материала</label>
            <select
              id="material_type_id"
              name="material_type_id"
              required
              value={form.material_type_id}
              onChange={handleChange}
            >
              <option value="">Выберите тип</option>
              {materialTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="course_id">Курс</label>
            <select
              id="course_id"
              name="course_id"
              required
              value={form.course_id}
              onChange={handleChange}
            >
              <option value="">Выберите курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label htmlFor="program_id">Направление</label>
            <select
              id="program_id"
              name="program_id"
              required
              value={form.program_id}
              onChange={handleChange}
            >
              <option value="">Выберите направление</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {saveError && (
            <div className="form-error">
              <p>{saveError}</p>
            </div>
          )}

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => navigate(`/materials/${id}`)}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default MaterialEditPage;
