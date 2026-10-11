const express   = require('express')
const dotenv    = require('dotenv')
const cors      = require('cors')
const helmet    = require('helmet')
const morgan    = require('morgan')
const multer    = require('multer')
const connectDB = require('./config/db')


dotenv.config()
connectDB()

const app = express()
app.set('trust proxy', 1)  // real client IP behind Render/Vercel proxy

// Standard security headers. The API is called cross-origin by the frontend,
// so resources must stay readable from other origins.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://e-sk-manage.vercel.app'
  ],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

const BASE_URI = process.env.BASE_URI || '/api/v1'

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

app.use(`${BASE_URI}/auth`,          require('./routes/authRoutes'))
app.use(`${BASE_URI}/announcements`, require('./routes/announcementRoutes'))
app.use(`${BASE_URI}/meetings`,      require('./routes/meetingRoutes'))
app.use(`${BASE_URI}/programs`,      require('./routes/programRoutes'))
app.use(`${BASE_URI}/points`,        require('./routes/pointsRoutes'))
app.use(`${BASE_URI}/admin`,         require('./routes/adminRoutes'))
app.use(`${BASE_URI}/finance`,       require('./routes/financeRoutes'))
app.use(`${BASE_URI}/upload`,        require('./routes/uploadRoutes'))
app.use(`${BASE_URI}/rewards`,       require('./routes/rewardRoutes'))
app.use(`${BASE_URI}/budget`,        require('./routes/budgetRoutes'))
app.use(`${BASE_URI}/public`,        require('./routes/publicRoutes'))
app.use(`${BASE_URI}/settings`, require('./routes/settingRoutes'));
app.use(`${BASE_URI}/notifications`, require('./routes/notificationRoutes'))

app.get('/', (req, res) => {
  res.json({ message: '✅ e-SK Manage API is running' })
})

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Last-resort error handler. Client errors (bad JSON, oversized or rejected
// uploads) keep their message; anything else is logged and answered generically.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large. Try a smaller photo or scan.' : err.message
    return res.status(400).json({ message })
  }
  const status = err.status || err.statusCode || 500
  if (status < 500) return res.status(status).json({ message: err.expose === false ? 'Bad request.' : err.message })

  console.error(err.stack || err)
  res.status(500).json({ message: 'Something went wrong on our end. Please try again.' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`Base URI: http://localhost:${PORT}${BASE_URI}`)
})