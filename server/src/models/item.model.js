// server/src/models/item.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const itemSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['weapon', 'ammo', 'medical', 'tool', 'armor', 'misc'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  effects: {
    // Different effects based on item type
    damage: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    healing: { type: Number, default: 0 },
    // Add more effects as needed
  },
  usable: {
    type: Boolean,
    default: false
  },
  usableBy: {
    survivor: { type: Boolean, default: true },
    zombie: { type: Boolean, default: false }
  },
  weight: {
    type: Number,
    default: 1
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'unique'],
    default: 'common'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add methods for item usage
itemSchema.methods.use = function(character) {
  // Implement item usage logic based on item type
  switch (this.type) {
    case 'medical':
      return { healAmount: this.effects.healing };
    case 'weapon':
      return { damage: this.effects.damage, accuracy: this.effects.accuracy };
    // Add more cases as needed
    default:
      return {};
  }
};

module.exports = mongoose.model('Item', itemSchema);
