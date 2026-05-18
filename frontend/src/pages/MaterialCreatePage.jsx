import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import CourseSelect from '../components/selectors/CourseSelect';
import MaterialTypeSelect from '../components/selectors/MaterialTypeSelect';
import ProgramSelect from '../components/selectors/ProgramSelect';
import SubjectSelect from '../components/selectors/SubjectSelect';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';
import { createMaterial } from '../api/materialsApi';

function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ');
  }

  return 'Не удалось отправить материал. Попробуйте еще раз.';
}

const initialFormData = {
  title: '',
  description: '',
  subject_id: '',
  material_type_id: '',
  course_id: '',
  program_id: '',
  file: null,
};

const MaterialCreatePage = () => {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const {
    courses,
    programs,
    subjects,
    materialTypes,
    isLoading: isReferenceDataLoading,
    error: referenceDataError,
  } = useReferenceData();
  const [formData, setFormData] = useState({
    ...initialFormData,
    course_id: user?.course_id ? String(user.course_id) : '',
    program_id: user?.program_id ? String(user.program_id) : '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCourseId = formData.course_id || (user?.course_id ? String(user.course_id) : '');
  const selectedProgramId = formData.program_id || (user?.program_id ? String(user.program_id) : '');

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthLoading) {
    return (
      <section className="material-create-page">
        <div className="material-create-card">
          <p className="profile-muted">Проверяем авторизацию...</p>
        </div>
      </section>
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;

    setFormData((currentFormData) => ({
      ...currentFormData,
      file,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.file) {
      setError('Выберите файл для загрузки.');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdMaterial = await createMaterial({
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject_id: Number(formData.subject_id),
        material_type_id: Number(formData.material_type_id),
        course_id: Number(selectedCourseId),
        program_id: Number(selectedProgramId),
        file: formData.file,
      });

      setSuccess(
        `Материал "${createdMaterial.title}" отправлен на модерацию и получил статус "${createdMaterial.status}".`
      );
      setFormData(initialFormData);
      event.target.reset();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="material-create-page">
      <div className="material-create-card">
        <div className="profile-header">
          <p className="eyebrow">Новый материал</p>
          <h1>Отправка на модерацию</h1>
          <p className="form-intro">
            Загрузите файл, укажите учебный контекст и отправьте материал в общий каталог.
          </p>
        </div>

        {referenceDataError && (
          <p className="form-error">
            Не удалось загрузить справочники. Попробуйте обновить страницу позже.
          </p>
        )}

        {error && (
          <p className="form-error">
            {error}
          </p>
        )}

        {success && (
          <p className="form-success">
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="form-grid form-grid--two material-create-form">
          <label className="form-field--wide">
            Название <span>*</span>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Например: Конспект по базам данных"
              maxLength={255}
              required
            />
          </label>

          <label className="form-field--wide">
            Описание
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Кратко опишите, чем полезен материал."
            />
          </label>

          <label>
            Предмет <span>*</span>
            <SubjectSelect
              name="subject_id"
              value={formData.subject_id}
              onChange={handleChange}
              subjects={subjects}
              isLoading={isReferenceDataLoading}
              hasError={Boolean(referenceDataError)}
              required
            />
          </label>

          <label>
            Тип материала <span>*</span>
            <MaterialTypeSelect
              name="material_type_id"
              value={formData.material_type_id}
              onChange={handleChange}
              materialTypes={materialTypes}
              isLoading={isReferenceDataLoading}
              hasError={Boolean(referenceDataError)}
              required
            />
          </label>

          <label>
            Курс <span>*</span>
            <CourseSelect
              name="course_id"
              value={selectedCourseId}
              onChange={handleChange}
              courses={courses}
              isLoading={isReferenceDataLoading}
              hasError={Boolean(referenceDataError)}
              required
            />
          </label>

          <label>
            Направление <span>*</span>
            <ProgramSelect
              name="program_id"
              value={selectedProgramId}
              onChange={handleChange}
              programs={programs}
              isLoading={isReferenceDataLoading}
              hasError={Boolean(referenceDataError)}
              required
            />
          </label>

          <label className="form-field--wide">
            Файл <span>*</span>
            <input
              type="file"
              name="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={handleFileChange}
              required
            />
            <small>Поддерживаются PDF, DOC, DOCX, PPT и PPTX размером до 20 МБ.</small>
          </label>

          <button
            type="submit"
            className="button button--primary form-button--wide"
            disabled={isSubmitting || isReferenceDataLoading || Boolean(referenceDataError)}
          >
            {isSubmitting ? 'Отправляем...' : 'Отправить материал'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default MaterialCreatePage;
