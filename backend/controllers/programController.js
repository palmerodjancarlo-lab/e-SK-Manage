// programController.js
// Kapag may bagong program, automatic lumalabas bilang announcement

const Program      = require('../models/Program')
const Announcement = require('../models/Announcement')
const AuditLog     = require('../models/AuditLog')

// @GET /api/programs
const getPrograms = async (req, res) => {
  try {
    const programs = await Program.find().sort({ createdAt: -1 })
    res.json({ programs })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @GET /api/programs/:id
const getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
    if (!program) return res.status(404).json({ message: 'Program not found' })
    res.json({ program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @POST /api/programs
const createProgram = async (req, res) => {
  try {
    const program = await Program.create({
      ...req.body,
      createdBy: req.user._id,
    })

    const dateStr = program.date
      ? new Date(program.date).toLocaleDateString('en-PH', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : 'TBA'

    // Auto-create announcement
    try {
      await Announcement.create({
        title:    `🏆 New SK Program: ${program.title}`,
        content:  `A new SK program has been announced!\n\n` +
                  `📌 Program: ${program.title}\n` +
                  (program.objectives ? `🎯 Objectives: ${program.objectives}\n` : '') +
                  (program.date       ? `📅 Date: ${dateStr}\n`                 : '') +
                  (program.venue      ? `📍 Venue: ${program.venue}\n`          : '') +
                  (program.sdgGoal    ? `🌐 SDG: ${program.sdgGoal}\n`          : '') +
                  `\nStatus: ${program.status}`,
        category: 'Programs',
        author:   req.user._id,
        isPinned: false,
      })
    } catch (annErr) {
      console.log('Auto-announcement error (non-critical):', annErr.message)
    }

    await AuditLog.create({
      user:    req.user._id,
      action:  'CREATE_PROGRAM',
      details: `Created program: ${program.title}`,
    })

    res.status(201).json({ message: 'Program created', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @PUT /api/programs/:id
const updateProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!program) return res.status(404).json({ message: 'Program not found' })

    // If status changed to Completed, post an announcement
    if (req.body.status === 'Completed') {
      try {
        await Announcement.create({
          title:    `✅ Program Completed: ${program.title}`,
          content:  `The SK program "${program.title}" has been successfully completed!\n\n` +
                    (program.accomplishments ? `📋 Accomplishments: ${program.accomplishments}` : ''),
          category: 'Programs',
          author:   req.user._id,
          isPinned: false,
        })
      } catch (annErr) {
        console.log('Completion announcement error (non-critical):', annErr.message)
      }
    }

    await AuditLog.create({
      user:    req.user._id,
      action:  'UPDATE_PROGRAM',
      details: `Updated program: ${program.title}`,
    })

    res.json({ message: 'Program updated', program })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @DELETE /api/programs/:id
const deleteProgram = async (req, res) => {
  try {
    await Program.findByIdAndDelete(req.params.id)
    res.json({ message: 'Program deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getPrograms, getProgram, createProgram, updateProgram, deleteProgram }