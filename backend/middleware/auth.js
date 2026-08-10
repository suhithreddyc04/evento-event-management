const jwt = require('jsonwebtoken');
const EventModel = require('../models/Event');

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Please log in to continue' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Session expired, please log in again' });
        req.user = decoded;
        next();
    });
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return next();

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (!err) req.user = decoded;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Admins can do anything a manager can; managers alone get no platform-wide access.
const requireManager = (req, res, next) => {
    if (req.user.isAdmin || req.user.role === 'manager') return next();
    return res.status(403).json({ message: 'Manager or admin access required' });
};

// Gates a route to admins, or to the manager assigned to the specific event involved.
// `resolveEventId(req)` returns (or resolves to) the event id the route acts on -
// e.g. req.params.id directly, or a lookup through a booking/review first.
const requireEventAccess = (resolveEventId) => (req, res, next) => {
    if (req.user.isAdmin) return next();
    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Manager or admin access required' });
    }

    Promise.resolve(resolveEventId(req))
        .then(eventId => {
            if (!eventId) return res.status(404).json({ message: 'Event not found' });

            return EventModel.findById(eventId).then(event => {
                if (!event) return res.status(404).json({ message: 'Event not found' });
                if (!event.manager || event.manager.toString() !== req.user.id) {
                    return res.status(403).json({ message: 'You do not manage this event' });
                }
                next();
            });
        })
        .catch(() => res.status(500).json({ message: 'Error checking event access' }));
};

module.exports = { requireAuth, optionalAuth, requireAdmin, requireManager, requireEventAccess };
