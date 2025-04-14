// server/src/models/suburb.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const suburbSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Coordinates of the suburb (top-left cell)
  location: {
    x: {
      type: Number,
      required: true,
      min: 0,
      max: 90,
      validate: {
        validator: function(v) {
          return v % 10 === 0; // Must be divisible by 10
        },
        message: props => `${props.value} is not a valid suburb X coordinate. Must be divisible by 10.`
      }
    },
    y: {
      type: Number,
      required: true,
      min: 0,
      max: 90,
      validate: {
        validator: function(v) {
          return v % 10 === 0; // Must be divisible by 10
        },
        message: props => `${props.value} is not a valid suburb Y coordinate. Must be divisible by 10.`
      }
    }
  },
  // Division the suburb belongs to (NW, NE, SW, SE)
  division: {
    type: String,
    enum: ['NW', 'NE', 'SW', 'SE'],
    required: true
  },
  // District number within division (1-5)
  district: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // Current danger level
  dangerLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Statistics
  population: {
    survivors: {
      type: Number,
      default: 0
    },
    zombies: {
      type: Number,
      default: 0
    }
  },
  // Any special properties
  properties: {
    type: Schema.Types.Mixed,
    default: {}
  },
  // Last update timestamp
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
suburbSchema.index({ 'location.x': 1, 'location.y': 1 }, { unique: true });
suburbSchema.index({ division: 1, district: 1 });

// Method to update population counts
suburbSchema.methods.updatePopulation = function(survivorCount, zombieCount) {
  this.population.survivors = survivorCount;
  this.population.zombies = zombieCount;
  this.updatedAt = Date.now();
  return this.save();
};

// Method to calculate danger level based on population ratio
suburbSchema.methods.calculateDangerLevel = function() {
  const { survivors, zombies } = this.population;
  if (survivors === 0 && zombies === 0) {
    this.dangerLevel = 0;
  } else if (survivors === 0) {
    this.dangerLevel = 100;
  } else {
    // Calculate danger level based on ratio
    const ratio = zombies / (survivors + zombies);
    this.dangerLevel = Math.min(100, Math.round(ratio * 100));
  }
  this.updatedAt = Date.now();
  return this.save();
};

// Static method to find by coordinates
suburbSchema.statics.findByCoordinates = function(x, y) {
  // Calculate the top-left corner of the suburb
  const suburbX = Math.floor(x / 10) * 10;
  const suburbY = Math.floor(y / 10) * 10;

  return this.findOne({
    'location.x': suburbX,
    'location.y': suburbY
  });
};

module.exports = mongoose.model('Suburb', suburbSchema);
