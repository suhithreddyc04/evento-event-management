import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';
import './FavoriteButton.css';

const FavoriteButton = ({ eventId, isFavorited, onChange, className = '' }) => {
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [favorited, setFavorited] = useState(!!isFavorited);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setFavorited(!!isFavorited);
    }, [isFavorited]);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (busy) return;

        const next = !favorited;
        setFavorited(next);
        setBusy(true);

        const request = next
            ? api.post(`/favorites/${eventId}`)
            : api.delete(`/favorites/${eventId}`);

        request
            .then(() => onChange?.(next))
            .catch(() => {
                setFavorited(!next);
                toast.error('Could not update favorites. Please try again.');
            })
            .finally(() => setBusy(false));
    };

    return (
        <button
            type="button"
            className={`favorite-button ${favorited ? 'is-favorited' : ''} ${className}`}
            onClick={handleClick}
            aria-pressed={favorited}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            disabled={busy}
        >
            <i className={favorited ? 'bi bi-heart-fill' : 'bi bi-heart'}></i>
        </button>
    );
};

export default FavoriteButton;
