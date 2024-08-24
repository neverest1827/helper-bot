const auth = require('basic-auth');
require('dotenv').config();

const name = process.env.NAME;
const pass = process.env.PASS;

const credentials = { name, pass };

function authMiddleware(req, res, next) {
    const user = auth(req);

    if (user && user.name === credentials.name && user.pass === credentials.pass) {
        return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Example"');
    res.status(401).send('Authentication required.');
}

module.exports = authMiddleware;