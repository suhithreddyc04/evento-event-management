import React from 'react';

const StarRating = ({ value = 0, onChange, readOnly = true }) => {
    const stars = [1, 2, 3, 4, 5];

    return (
        <div className={`star-rating${readOnly ? '' : ' star-rating-interactive'}`}>
            {stars.map((star) => (
                <i
                    key={star}
                    className={`bi ${star <= Math.round(value) ? 'bi-star-fill' : 'bi-star'}`}
                    onClick={readOnly ? undefined : () => onChange(star)}
                    role={readOnly ? undefined : 'button'}
                    aria-label={readOnly ? undefined : `Rate ${star} out of 5`}
                />
            ))}
        </div>
    );
};

export default StarRating;
