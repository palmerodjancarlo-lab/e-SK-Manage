const Program  = require('../models/Program')
const AuditLog = require('../models/AuditLog')

const getPrograms = async (req, res) => {
  try {
    const { status } = req.query
    let query = {}
    if (status) query.status = status
    const programs = await Program
      .find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
    res.json({ programs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getProgram = async (req, res) => {
  try {
    const program = await Program
      .findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
    if (!program) return res.status(404).json({ message: 'Program not found' })
    res.json({ program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const createProgram = async (req, res) => {
  try {
    const program = await Program.create({
      ...req.body,
      createdBy: req.user._id
    })
    await AuditLog.create({
      user: req.user._id,
      action: 'CREATE_PROGRAM',
      details: `Created program: ${program.title}`
    })
    res.status(201).json({ message: 'Program created', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateProgram = async (req, res) => {
  try {
    const program = await Program
      .findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!program) return res.status(404).json({ message: 'Program not found' })
    res.json({ message: 'Program updated', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteProgram = async (req, res) => {
  try {
    await Program.findByIdAndDelete(req.params.id)
    res.json({ message: 'Program deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  getPrograms, getProgram,
  createProgram, updateProgram, deleteProgram
}