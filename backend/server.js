const express   = require('express')
const dotenv    = require('dotenv')
const cors      = require('cors')
const morgan    = require('morgan')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()

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

app.use(`${BASE_URI}/auth`,          require('./routes/authRoutes'))
app.use(`${BASE_URI}/announcements`, require('./routes/announcementRoutes'))
app.use(`${BASE_URI}/meetings`,      require('./routes/meetingRoutes'))
app.use(`${BASE_URI}/programs`,      require('./routes/programRoutes'))
app.use(`${BASE_URI}/points`,        require('./routes/pointsRoutes'))
app.use(`${BASE_URI}/admin`,         require('./routes/adminRoutes'))

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Base URI: http://localhost:${PORT}${BASE_URI}`)
})