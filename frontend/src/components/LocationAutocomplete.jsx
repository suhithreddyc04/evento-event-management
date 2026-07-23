import React, { useEffect, useRef, useState } from 'react';
import './LocationAutocomplete.css';

const LocationAutocomplete = ({ value, onChange, placeholder }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const trimmed = value.trim();

        if (trimmed.length < 3) {
            setSuggestions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const timeoutId = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(trimmed)}`)
                .then(res => res.json())
                .then(results => setSuggestions(results))
                .catch(() => setSuggestions([]))
                .finally(() => setLoading(false));
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (suggestion) => {
        onChange(suggestion.display_name);
        setSuggestions([]);
        setOpen(false);
    };

    const showDropdown = open && value.trim().length >= 3 && (loading || suggestions.length > 0);

    return (
        <div className="location-autocomplete" ref={containerRef}>
            <input
                className="form-control"
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
            />
            {showDropdown && (
                <ul className="location-suggestions">
                    {loading ? (
                        <li className="location-suggestion-status">Searching...</li>
                    ) : (
                        suggestions.map((suggestion) => (
                            <li
                                key={suggestion.place_id}
                                className="location-suggestion"
                                onClick={() => handleSelect(suggestion)}
                            >
                                {suggestion.display_name}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default LocationAutocomplete;
