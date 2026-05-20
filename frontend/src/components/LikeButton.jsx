import { useState } from 'react';
import { likeMaterial, unlikeMaterial } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';

function LikeButton({ materialId, initialCount = 0, initialIsLiked = false, onToggle }) {
  const { user } = useAuth();
  const [count, setCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isPending, setIsPending] = useState(false);

  async function handleToggle() {
    if (!user || isPending) return;

    setIsPending(true);
    try {
      const data = isLiked ? await unlikeMaterial(materialId) : await likeMaterial(materialId);
      setCount(data.likes_count);
      setIsLiked(data.is_liked);
      onToggle?.(data.is_liked);
    } catch {
      // ignore — server may return 409 if state is out of sync
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      className={`like-button${isLiked ? ' is-active' : ''}`}
      type="button"
      disabled={!user || isPending}
      aria-label={isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
      onClick={handleToggle}
    >
      ♥ {count}
    </button>
  );
}

export default LikeButton;
