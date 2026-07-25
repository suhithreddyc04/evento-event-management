import { Link } from 'react-router-dom';
import { Reveal } from './Reveal.jsx';

const NotFound = () => (
    <Reveal className="d-flex flex-column justify-content-center align-items-center text-center vh-100">
        <i className="bi bi-signpost-2" style={{ fontSize: '4rem', color: 'var(--color-accent)', marginBottom: '0.5rem' }}></i>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '4rem', color: 'var(--color-primary)', margin: 0 }}>404</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            Looks like this event wandered off. The page you're looking for doesn't exist.
        </p>
        <Link to="/home" className="btn btn-primary">Go Home</Link>
    </Reveal>
);

export default NotFound;
