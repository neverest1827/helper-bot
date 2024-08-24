const auth = require('basic-auth');

const credentials = { name: 'admin', pass: 'Nb2Gtv8Cc' }; // Замените на свои логин и пароль

function authMiddleware(req, res, next) {
    const user = auth(req);

    if (user && user.name === credentials.name && user.pass === credentials.pass) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Example"');
    res.status(401).send('Authentication required.');
}

module.exports = authMiddleware;