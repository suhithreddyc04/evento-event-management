// Safety net for anything that reaches Express without already being
// handled by the route itself (a thrown synchronous error, a rejected
// promise passed to next(err), malformed JSON from express.json(), or a
// request to a path no router matched). Individual routes still catch and
// respond to their own expected failures — this only catches what slips
// past that.

function notFound(req, res) {
    res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);

    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON body' });
    }

    const status = err && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({ message: status === 500 ? 'Something went wrong' : err.message });
}

module.exports = { notFound, errorHandler };
