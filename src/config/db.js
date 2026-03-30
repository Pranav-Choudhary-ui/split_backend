const mongoose = require('mongoose')
const logger = require('../utils/logger')

const connectDB = async () => {

	const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
	if (!mongoUri) {
		const err = new Error('MONGODB_URI is not configured')
		logger.error(`MONGODB_URI not configured | ${err.message}`)
		throw err
	}

	try {
		await mongoose.connect(mongoUri)
		console.log('DB Connected')
		logger.info('DB Connection Established')
	} catch (err) {
		console.error(`DB Connection Fail | ${err.stack || err.message}`)
		logger.error(`DB Connection Fail | ${err.stack || err.message}`)
		throw err
	}
}

module.exports = connectDB