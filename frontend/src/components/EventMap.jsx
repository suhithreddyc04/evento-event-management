import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

// Vite bundles Leaflet's default marker images under hashed URLs that the
// library's built-in icon lookup can't resolve, so we point it at the
// imported asset URLs directly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const EventMap = ({ location, name }) => {
    const [position, setPosition] = useState(null);
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        if (!location) return;

        setStatus('loading');
        const controller = new AbortController();

        fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(location)}`, {
            signal: controller.signal,
        })
            .then(res => res.json())
            .then(results => {
                if (!results[0]) {
                    setStatus('error');
                    return;
                }
                setPosition({ lat: Number(results[0].lat), lng: Number(results[0].lon) });
                setStatus('ready');
            })
            .catch(() => {
                if (!controller.signal.aborted) setStatus('error');
            });

        return () => controller.abort();
    }, [location]);

    if (status === 'error') {
        return <p className="event-location-map-error">Could not load the map for this location.</p>;
    }

    if (status === 'loading' || !position) {
        return <div className="event-location-map event-location-map-loading">Loading map...</div>;
    }

    return (
        <MapContainer
            className="event-location-map"
            center={[position.lat, position.lng]}
            zoom={14}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[position.lat, position.lng]}>
                <Popup>{name}</Popup>
            </Marker>
        </MapContainer>
    );
};

export default EventMap;
