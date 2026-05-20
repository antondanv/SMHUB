import { useState } from 'react';
import { createReport } from '../api/reportsApi';

const REASONS = [
  { value: 'spam', label: 'Спам' },
  { value: 'incorrect', label: 'Неверная информация' },
  { value: 'inappropriate', label: 'Неприемлемый контент' },
  { value: 'copyright', label: 'Нарушение авторских прав' },
  { value: 'other', label: 'Другое' },
];

function ReportButton({ targetType, targetId, label = 'Пожаловаться' }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await createReport({ target_type: targetType, target_id: targetId, reason, comment });
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setComment('');
        setReason('spam');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось отправить жалобу.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="report-link" onClick={() => setOpen(true)}>
        ⚐ {label}
      </button>
      {open && (
        <div className="modal-overlay" onClick={() => !loading && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Сообщить о проблеме</h3>
            {success ? (
              <p className="form-success">Спасибо, жалоба отправлена.</p>
            ) : (
              <>
                <label className="field-group">
                  <span>Причина</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label className="field-group">
                  <span>Комментарий (необязательно)</span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder="Опишите проблему..."
                  />
                </label>
                {error && <p className="form-error">{error}</p>}
                <div className="action-row">
                  <button
                    type="button"
                    className="button button--primary"
                    disabled={loading}
                    onClick={submit}
                  >
                    {loading ? 'Отправляем...' : 'Отправить'}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={loading}
                    onClick={() => setOpen(false)}
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ReportButton;
