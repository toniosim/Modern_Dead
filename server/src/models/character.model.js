// src/models/character.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const characterSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  type: {
    type: String,
    enum: ['survivor', 'zombie'],
    required: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  health: {
    current: {
      type: Number,
      default: 50
    },
    max: {
      type: Number,
      default: 50
    }
  },
  location: {
    x: Number,
    y: Number,
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    },
    areaName: String
  },
  inventory: [{
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  skills: [{
    name: String,
    level: {
      type: Number,
      default: 1
    }
  }],
  actions: {
    availableActions: {
      type: Number,
      default: 50
    },
    lastActionTime: {
      type: Date,
      default: Date.now
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for checking if character is alive
characterSchema.virtual('isAlive').get(function() {
  return this.health.current > 0;
});

// Method to update character location
characterSchema.methods.updateLocation = function(x, y, buildingId, areaName) {
  this.location.x = x;
  this.location.y = y;
  this.location.buildingId = buildingId || null;
  this.location.areaName = areaName || '';
  return this.save();
};

// Method to change character type (e.g., survivor becomes zombie)
characterSchema.methods.changeType = function(newType) {
  if (!['survivor', 'zombie'].includes(newType)) {
    throw new Error('Invalid character type');
  }
  this.type = newType;
  return this.save();
};

module.exports = mongoose.model('Character', characterSchema);
