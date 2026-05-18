function formatDate(value) {
  if (!value) {
    return 'Дата не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 Б';
  }

  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formattedSize = size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1);

  return `${formattedSize} ${units[unitIndex]}`;
}

function getFileTypeLabel(material) {
  const fileExtension = material.file_name?.split('.').pop();

  if (fileExtension) {
    return fileExtension.toUpperCase();
  }

  const mimePart = material.mime_type?.split('/').pop();
  return mimePart ? mimePart.toUpperCase() : 'FILE';
}

function getAuthorLabel(material) {
  return material.author?.full_name || material.author?.username || 'Неизвестный автор';
}

export function toMaterialCardView(material) {
  return {
    id: material.id,
    title: material.title,
    excerpt: material.description || 'Описание пока не добавлено.',
    subject: material.subject.name,
    type: material.material_type.name,
    course: material.course.name,
    program: `${material.program.code} - ${material.program.name}`,
    author: getAuthorLabel(material),
    publishedAt: formatDate(material.published_at || material.created_at),
    views: material.views_count,
    downloads: material.downloads_count,
    favoritesCount: material.favorites_count,
    fileType: getFileTypeLabel(material),
    fileSize: formatFileSize(material.file_size),
    status: material.status,
    isFavorite: material.is_favorite,
  };
}
