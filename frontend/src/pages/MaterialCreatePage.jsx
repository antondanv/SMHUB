import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import CourseSelect from '../components/selectors/CourseSelect';
import MaterialTypeSelect from '../components/selectors/MaterialTypeSelect';
import ProgramSelect from '../components/selectors/ProgramSelect';
import SubjectSelect from '../components/selectors/SubjectSelect';
import { useAuth } from '../context/useAuth';
import { useReferenceData } from '../context/useReferenceData';
import { createMaterial } from '../api/materialsApi';
import { isAdminUser } from '../utils/auth';

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
  is_editorial: false,
  file: null,
};

function getInitialFormData(user) {
  return {
    ...initialFormData,
    course_id: user?.course_id ? String(user.course_id) : '',
    program_id: user?.program_id ? String(user.program_id) : '',
  };
}

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
  const [formData, setFormData] = useState(() => getInitialFormData(user));
  const [error, setError] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedCourseId = formData.course_id || (user?.course_id ? String(user.course_id) : '');
  const selectedProgramId = formData.program_id || (user?.program_id ? String(user.program_id) : '');

  if (!isAuthLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthLoading) {
    return (
      <section className="page-shell">
        <div className="surface-card surface-card--single">
          <p className="profile-muted">Проверяем авторизацию...</p>
        </div>
      </section>
    );
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: type === 'checkbox' ? checked : value,
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
    setSubmissionResult(null);

    if (!formData.file) {
      setError('Выберите файл для загрузки.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedSubject = subjects.find((item) => item.id === Number(formData.subject_id));
      const selectedMaterialType = materialTypes.find(
        (item) => item.id === Number(formData.material_type_id)
      );

      const createdMaterial = await createMaterial({
        title: formData.title.trim(),
        description: formData.description.trim(),
        subject_id: Number(formData.subject_id),
        material_type_id: Number(formData.material_type_id),
        course_id: Number(selectedCourseId),
        program_id: Number(selectedProgramId),
        is_editorial: formData.is_editorial,
        file: formData.file,
      });

      setSubmissionResult({
        ...createdMaterial,
        subject_name: createdMaterial.subject?.name || selectedSubject?.name || '',
        material_type_name:
          createdMaterial.material_type?.name || selectedMaterialType?.name || '',
      });
      setFormData(getInitialFormData(user));
      event.target.reset();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartAnotherUpload() {
    setSubmissionResult(null);
    setError(null);
    setFormData(getInitialFormData(user));
  }

  if (submissionResult) {
    const isEditorial = Boolean(submissionResult.is_editorial);
    const statusTitle = isEditorial ? 'Материал опубликован.' : 'Материал отправлен на модерацию.';
    const statusCopy = isEditorial
      ? 'Карточка уже доступна в каталоге от редакции. Можно открыть её сразу или продолжить загрузку.'
      : 'Файл загружен, карточка создана, дальше материал пройдёт проверку модератором перед публикацией в каталоге.';
    const nextActionHref = isEditorial ? `/materials/${submissionResult.id}` : '/my-materials';
    const nextActionLabel = isEditorial ? 'Открыть материал' : 'Перейти в мои материалы';

    return (
      <section className="page-shell">
        <div className="form-layout form-layout--upload">
          <aside className="surface-card surface-card--sidebar surface-card--upload-aside">
            <div className="section-heading section-heading--compact">
              <p className="caps-label">Статус отправки</p>
              <h1>{isEditorial ? 'Публикация завершена' : 'Очередь модерации'}</h1>
            </div>

            <p className="body-copy">
              {isEditorial
                ? 'Редакционный материал опубликован сразу и уже виден пользователям.'
                : 'Новый материал попал в очередь проверки. После модерации он появится в общем каталоге.'}
            </p>

            <div className="metric-stack metric-stack--profile">
              <div className="metric-stack__item">
                <strong>{isEditorial ? 'Опубликован' : 'На проверке'}</strong>
                <span>Текущий статус</span>
              </div>
              <div className="metric-stack__item">
                <strong>{submissionResult.material_type_name || 'Материал'}</strong>
                <span>Тип загрузки</span>
              </div>
              <div className="metric-stack__item">
                <strong>{submissionResult.subject_name || 'Без предмета'}</strong>
                <span>Предмет</span>
              </div>
            </div>
          </aside>

          <div className="surface-card surface-card--form surface-card--upload-form submission-state">
            <div className="submission-state__hero">
              <span className="submission-state__icon" aria-hidden="true">
                <AppIcon name={isEditorial ? 'check' : 'files'} size={28} />
              </span>

              <div className="section-heading">
                <p className="caps-label">{isEditorial ? 'Опубликовано' : 'Отправлено на модерацию'}</p>
                <h2>{statusTitle}</h2>
                <p className="hero-copy">{statusCopy}</p>
              </div>
            </div>

            <div className="submission-state__details">
              <div className="submission-state__detail">
                <strong>Название</strong>
                <span>{submissionResult.title}</span>
              </div>
              <div className="submission-state__detail">
                <strong>Файл</strong>
                <span>{submissionResult.file_name || 'Файл загружен'}</span>
              </div>
              <div className="submission-state__detail">
                <strong>Статус</strong>
                <span>{isEditorial ? 'Опубликован в каталоге' : 'Ожидает проверки модератором'}</span>
              </div>
            </div>

            <div className="mini-list">
              <div className="mini-list__item">
                <strong>{isEditorial ? 'Что дальше' : 'Что происходит дальше'}</strong>
                <span>
                  {isEditorial
                    ? 'Материал уже доступен пользователям. Вы можете открыть карточку или продолжить загрузку новых файлов.'
                    : 'Модератор проверит файл, описание и привязку к предмету. После одобрения материал появится в каталоге.'}
                </span>
              </div>
            </div>

            <div className="submission-state__actions">
              <button type="button" className="button button--primary" onClick={handleStartAnotherUpload}>
                Загрузить ещё один
              </button>
              <Link className="button button--secondary" to={nextActionHref}>
                {nextActionLabel}
              </Link>
              <Link className="button button--ghost" to="/materials">
                Вернуться в каталог
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="form-layout form-layout--upload">
        <aside className="surface-card surface-card--sidebar surface-card--upload-aside">
          <div className="section-heading section-heading--compact">
            <p className="caps-label">Новый материал</p>
            <h1>Отправка на модерацию</h1>
          </div>

          <p className="body-copy">
            Новый интерфейс делает длинную форму спокойнее: слева короткая памятка, справа
            основная форма отправки.
          </p>

          <div className="metric-stack metric-stack--profile">
            <div className="metric-stack__item">
              <strong>PDF / DOCX / PPTX</strong>
              <span>Поддерживаемые форматы</span>
            </div>
            <div className="metric-stack__item">
              <strong>20 МБ</strong>
              <span>Максимальный размер файла</span>
            </div>
            <div className="metric-stack__item">
              <strong>1-2 дня</strong>
              <span>Средний срок модерации</span>
            </div>
          </div>
        </aside>

        <div className="surface-card surface-card--form surface-card--upload-form">
          <div className="section-heading">
            <p className="caps-label">Форма загрузки</p>
            <h2>Подготовьте материал к публикации</h2>
            <p className="hero-copy">
              Загрузите файл, укажите предмет и тип материала, а затем отправьте его в общий
              каталог SMHUB.
            </p>
          </div>

          {referenceDataError && (
            <p className="form-error">
              Не удалось загрузить справочники. Попробуйте обновить страницу позже.
            </p>
          )}

          {error && <p className="form-error">{error}</p>}

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

            <label className="form-field--wide upload-field">
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

            {isAdminUser(user) && (
              <label className="form-field--wide editorial-checkbox">
                <input
                  type="checkbox"
                  name="is_editorial"
                  checked={formData.is_editorial}
                  onChange={handleChange}
                />
                Опубликовать от редакции (без очереди модерации)
              </label>
            )}

            <button
              type="submit"
              className="button button--primary form-button--wide"
              disabled={isSubmitting || isReferenceDataLoading || Boolean(referenceDataError)}
            >
              {isSubmitting ? 'Отправляем...' : 'Отправить материал'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default MaterialCreatePage;
