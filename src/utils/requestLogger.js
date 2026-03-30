var logger = require('./logger')

const requestLogger = (req, res, next) => {
    try {
        logger.info(`API HIT : [${req.method}] ${req.url} | ${JSON.stringify(req.body)}`)
        next()
    } catch (err) {
        next(err)
    }
}

module.exports = requestLogger;