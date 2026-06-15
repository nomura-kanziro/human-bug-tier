const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  value: { type: String, required: true, trim: true },
  type: { type: String, enum: ['userId', 'ip'], default: 'userId' },
  reason: { type: String, default: '' },
  durationDays: { type: Number, required: true, min: 1, max: 9999 },
  blockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

blockSchema.index({ value: 1 }, { unique: true });

const Block = mongoose.model('Block', blockSchema);
module.exports = Block;