// server/src/models/revivePoint.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const revivePointSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  location: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    },
    suburb: {
      type: Schema.Types.ObjectId,
      ref: 'Suburb',
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'slow', 'dangerous', 'inactive', 'unknown'],
    default: 'unknown'
  },
  // Group maintaining this revive point (optional)
  maintainer: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  // Associated entry and healing points
  associatedLocations: {
    entryPoint: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    },
    healingPoint: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    }
  },
  // Statistics
  statistics: {
    totalRevives: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: null
    }
  },
  // Additional information
  description: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
revivePointSchema.index({ 'location.x': 1, 'location.y': 1 }, { unique: true });
revivePointSchema.index({ 'location.suburb': 1 });
revivePointSchema.index({ status: 1 });

// Method to update status
revivePointSchema.methods.updateStatus = function(newStatus, description) {
  this.status = newStatus;
  if (description) {
    this.description = description;
  }
  this.updatedAt = Date.now();
  return this.save();
};

// Record a revive attempt
revivePointSchema.methods.recordRevive = function(success) {
  this.statistics.totalRevives += 1;

  // Update success rate
  if (success) {
    const oldTotal = this.statistics.totalRevives - 1;
    const oldSuccesses = Math.round(this.statistics.successRate * oldTotal / 100);
    const newSuccesses = oldSuccesses + 1;
    this.statistics.successRate = Math.round((newSuccesses / this.statistics.totalRevives) * 100);
  } else {
    const oldTotal = this.statistics.totalRevives - 1;
    const oldSuccesses = Math.round(this.statistics.successRate * oldTotal / 100);
    this.statistics.successRate = Math.round((oldSuccesses / this.statistics.totalRevives) * 100);
  }

  this.statistics.lastActivity = Date.now();
  this.updatedAt = Date.now();
  return this.save();
};

// Find active revive points
revivePointSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Find nearest revive point to coordinates
revivePointSchema.statics.findNearest = async function(x, y) {
  // Get all revive points
  const revivePoints = await this.find().exec();

  // Calculate distances
  const withDistances = revivePoints.map(point => {
    const dx = point.location.x - x;
    const dy = point.location.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return { point, distance };
  });

  // Sort by distance
  withDistances.sort((a, b) => a.distance - b.distance);

  return withDistances.length > 0 ? withDistances[0].point : null;
};

module.exports = mongoose.model('RevivePoint', revivePointSchema);
