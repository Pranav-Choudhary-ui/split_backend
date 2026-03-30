const logger = require('./logger')

const createHttpError = (status, message, details) => {
    const error = new Error(message)
    error.status = status
    if (details) {
        error.details = details
    }
    return error
}

const sendSuccess = (res, { status = 200, message = 'Success', ...payload } = {}) => {
    return res.status(status).json({
        success: true,
        message,
        ...payload
    })
}

const normalizeError = (err) => {
    if (err?.name === 'ValidationError') {
        return {
            status: 400,
            message: 'Validation failed',
            details: Object.values(err.errors || {}).map((e) => e.message)
        }
    }

    if (err?.code === 11000) {
        return {
            status: 409,
            message: 'Resource already exists',
            details: err.keyValue
        }
    }

    return {
        status: err?.status || 500,
        message: err?.message || 'Internal server error',
        details: err?.details
    }
}

const sendError = (req, res, err) => {
    const normalized = normalizeError(err)

    logger.error(
        `URL : ${req.originalUrl} | status : ${normalized.status} | message: ${normalized.message}`
    )

    const response = {
        success: false,
        message: normalized.message
    }

    if (normalized.details) {
        response.details = normalized.details
    }

    return res.status(normalized.status).json(response)
}

module.exports = {
    createHttpError,
    sendSuccess,
    sendError
}
