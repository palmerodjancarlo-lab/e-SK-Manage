// utils/serverError.js
// Single place that turns a caught error into an HTTP response.
// Client mistakes (bad input, bad id, duplicates) keep a useful message;
// anything unexpected is logged here and answered with a generic message,
// so stack details and database internals never reach the browser.

const serverError = (res, error) => {
  if (error?.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0]
    return res.status(400).json({ message: first?.message || 'Some fields are invalid.' })
  }
  if (error?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier or value.' })
  }
  if (error?.code === 11000) {
    return res.status(409).json({ message: 'A record with the same details already exists.' })
  }

  console.error(error)
  return res.status(500).json({ message: 'Something went wrong on our end. Please try again.' })
}

module.exports = serverError
