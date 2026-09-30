// Star rating that is a real radio group: keyboard operable, and it reports
// the number rather than relying on colour alone.
export default function StarRating({ value, onChange, disabled = false }) {
  return (
    <div className="star-rating" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          className={`star ${star <= value ? 'star-on' : 'star-off'}`}
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
        >
          &#9733;
        </button>
      ))}
      {value > 0 && <span className="star-value">{value}/5</span>}
    </div>
  )
}
