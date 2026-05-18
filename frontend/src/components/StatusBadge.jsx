const STATUS_LABELS = {
  published: 'Опубликован',
  pending: 'На проверке',
  rejected: 'Отклонён',
  archived: 'В архиве',
};

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default StatusBadge;
