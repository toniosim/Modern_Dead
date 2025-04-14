// server/src/models/message.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  // Message type
  type: {
    type: String,
    enum: ['radio', 'graffiti', 'local', 'system'],
    required: true
  },
  // Content
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  // Sender
  sender: {
    character: {
      type: Schema.Types.ObjectId,
      ref: 'Character',
      default: null
    },
    username: String,
    isZombie: {
      type: Boolean,
      default: false
    }
  },
  // For radio messages
  radioFrequency: {
    type: Number,
    min: 25.90,
    max: 29.00
  },
  // Location where message was sent
  location: {
    x: Number,
    y: Number,
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building',
      default: null
    },
    suburb: {
      type: Schema.Types.ObjectId,
      ref: 'Suburb'
    }
  },
  // Recipients array (for local messages)
  recipients: [{
    type: Schema.Types.ObjectId,
    ref: 'Character'
  }],
  // For graffiti - permanence
  isPermanent: {
    type: Boolean,
    default: false
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 24 hours for radio, 7 days for graffiti
      const hours = this.type === 'radio' ? 24 : this.type === 'graffiti' ? 168 : 1;
      const date = new Date();
      date.setHours(date.getHours() + hours);
      return date;
    }
  }
});

// Indexes
messageSchema.index({ createdAt: 1 });
messageSchema.index({ expiresAt: 1 });
messageSchema.index({ radioFrequency: 1, createdAt: -1 });
messageSchema.index({ 'location.suburb': 1, createdAt: -1 });
messageSchema.index({ 'location.x': 1, 'location.y': 1, createdAt: -1 });

// Time-to-live index to automatically delete expired messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Find radio messages by frequency
messageSchema.statics.findByFrequency = function(frequency, limit = 20) {
  return this.find({
    type: 'radio',
    radioFrequency: frequency
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Find local messages in a location
messageSchema.statics.findByLocation = function(x, y, radius = 0, limit = 20) {
  return this.find({
    type: 'local',
    'location.x': { $gte: x - radius, $lte: x + radius },
    'location.y': { $gte: y - radius, $lte: y + radius }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Find graffiti in a location
messageSchema.statics.findGraffitiByLocation = function(x, y, limit = 10) {
  return this.find({
    type: 'graffiti',
    'location.x': x,
    'location.y': y
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);
