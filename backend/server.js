const express   = require('express')
const dotenv    = require('dotenv')
const cors      = require('cors')
const morgan    = require('morgan')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()

// ── CORS — allow frontend ─────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'))
app.use('/api/announcements', require('./routes/announcementRoutes'))
app.use('/api/meetings',      require('./routes/meetingRoutes'))
app.use('/api/programs',      require('./routes/programRoutes'))
app.use('/api/points',        require('./routes/pointsRoutes'))
app.use('/api/admin',         require('./routes/adminRoutes'))

app.get('/', (req, res) => {
  res.json({ message: '✅ e-SK Manage API is running' })
})

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Server Error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})