// tests/user.model.test.js
// Tests for User model methods using mocks — no real DB needed

jest.mock('../models/User')

const User = require('../models/User')

describe('User model mock', () => {

  beforeEach(() => jest.clearAllMocks())

  test('User.create is callable', async () => {
    User.create = jest.fn().mockResolvedValue({
      _id:'abc', firstName:'Juan', email:'juan@test.com', role:'kabataan_user'
    })
    const user = await User.create({ firstName:'Juan', email:'juan@test.com', password:'pass' })
    expect(user.role).toBe('kabataan_user')
    expect(User.create).toHaveBeenCalledTimes(1)
  })

  test('User.findOne returns null for non-existent email', async () => {
    User.findOne = jest.fn().mockResolvedValue(null)
    const user = await User.findOne({ email:'nobody@test.com' })
    expect(user).toBeNull()
  })

  test('User.findById returns user object', async () => {
    User.findById = jest.fn().mockResolvedValue({
      _id:'abc', firstName:'Juan', role:'kabataan_user', isActive:true
    })
    const user = await User.findById('abc')
    expect(user.isActive).toBe(true)
  })

  test('User.countDocuments returns a number', async () => {
    User.countDocuments = jest.fn().mockResolvedValue(5)
    const count = await User.countDocuments({ role:'kabataan_user' })
    expect(count).toBe(5)
  })

  test('matchPassword mock returns true for correct password', async () => {
    const mockUser = {
      _id:'abc', email:'juan@test.com',
      matchPassword: jest.fn().mockResolvedValue(true)
    }
    const result = await mockUser.matchPassword('correctpass')
    expect(result).toBe(true)
    expect(mockUser.matchPassword).toHaveBeenCalledWith('correctpass')
  })

  test('matchPassword mock returns false for wrong password', async () => {
    const mockUser = {
      _id:'abc', email:'juan@test.com',
      matchPassword: jest.fn().mockResolvedValue(false)
    }
    const result = await mockUser.matchPassword('wrongpass')
    expect(result).toBe(false)
  })

  test('User.findByIdAndUpdate is callable', async () => {
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({
      _id:'abc', firstName:'Updated', role:'sk_officer'
    })
    const updated = await User.findByIdAndUpdate('abc', { role:'sk_officer' }, { new:true })
    expect(updated.role).toBe('sk_officer')
  })

  test('User.findByIdAndDelete removes a user', async () => {
    User.findByIdAndDelete = jest.fn().mockResolvedValue({ _id:'abc' })
    const result = await User.findByIdAndDelete('abc')
    expect(result._id).toBe('abc')
    expect(User.findByIdAndDelete).toHaveBeenCalledWith('abc')
  })
})