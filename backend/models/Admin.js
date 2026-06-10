const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  loginId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '관리자',
    trim: true,
  },
}, {
  timestamps: true,
});

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;