import { useState } from 'react';
import { rateMaterial, updateRating } from '../api/materialsApi';
import { useAuth } from '../context/useAuth';

function RatingStars({ materialId, initialAvg = null, initialCount = 0, initialUserRating = null }) {
  const { user } = useAuth();
  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [hovered, setHovered] = useState(0);
  const [isPending, setIsPending] = useState(false);

  async function handleRate(value) {
    if (!user || isPending) return;
    setIsPending(true);
    try {
      const api = userRating ? updateRating : rateMaterial;
      const data = await api(materialId, value);
      setAvg(data.avg_rating);
      setCount(data.ratings_count);
      setUserRating(data.user_rating);
    } catch {
      // ignore
    } finally {
      setIsPending(false);
    }
  }

  const displayRating = hovered || userRating || 0;

  return (
    <div className="rating-stars-widget">
      <div
        className="rating-stars-interactive"
        onMouseLeave={() => setHovered(0)}
        aria-label="Оценить материал"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`rating-star${displayRating >= star ? ' is-active' : ''}`}
            disabled={!user || isPending}
            onMouseEnter={() => setHovered(star)}
            onClick={() => handleRate(star)}
            aria-label={`${star} звезд`}
          >
            ★
          </button>
        ))}
      </div>
      {avg !== null && (
        <span className="rating-summary-text">
          {avg.toFixed(1)} ({count})
        </span>
      )}
      {!avg && count === 0 && <span className="rating-summary-text">Нет оценок</span>}
    </div>
  );
}

export default RatingStars;
