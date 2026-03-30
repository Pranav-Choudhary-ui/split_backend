require("dotenv").config();

const app = require('./src/app')
const logger = require('./src/utils/logger')
const connectDB = require('./src/config/db')

const PORT = process.env.PORT || 3001;

(async () => {
    try {
        await connectDB()

        app.listen(PORT, (err) => {
            if (err) {
                console.error(`Server failed to start: ${err.message}`)
                logger.error(`Server failed to start: ${err.message}`)
                process.exit(1)
            }

            console.log(`Server started in PORT | ${PORT}`)
            logger.info(`Server started in PORT | ${PORT}`)
        });
    } catch (err) {
        console.error(`Startup error: ${err.stack || err.message}`)
        logger.error(`Startup error: ${err.stack || err.message}`)
        process.exit(1)
    }
})();