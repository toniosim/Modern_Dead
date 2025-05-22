const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const buildingSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'AUTO_REPAIR', 'CHURCH', 'CINEMA', 'CLUB', 'FACTORY', 'FIRE_STATION',
      'HOSPITAL', 'HOTEL', 'JUNKYARD', 'LIBRARY', 'MUSEUM', 'NECROTECH',
      'POLICE_DEPARTMENT', 'PUB', 'SCHOOL', 'WAREHOUSE', 'MALL', 'MANSION',
      'CATHEDRAL', 'STADIUM', 'FORT', 'POWER_STATION', 'ZOO'
    ],
    required: true
  },
  size: {
    width: { type: Number, default: 1 },
    height: { type: Number, default: 1 }
  },
  // Building state
  state: {
    type: String,
    enum: ['normal', 'ransacked', 'ruined'],
    default: 'normal'
  },
  isPowered: {
    type: Boolean,
    default: false
  },
  // Barricade level (0-100+)
  barricadeLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  // Whether doors are open or closed
  doorsOpen: {
    type: Boolean,
    default: true
  },
  // Location on map
  location: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    suburb: { type: Schema.Types.ObjectId, ref: 'Suburb', required: true }
  },
  // Specific properties based on building type
  properties: {
    type: Schema.Types.Mixed
  },
// AP regeneration properties
  apRegeneration: {
    // Base AP regeneration bonus when resting in this building
    bonus: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    // Is this a special AP recovery location?
    isRecoveryLocation: {
      type: Boolean,
      default: false
    },
    // Class-specific bonuses (if applicable)
    classBonuses: {
      military: {
        type: Number,
        default: 0
      },
      civilian: {
        type: Number,
        default: 0
      },
      scientist: {
        type: Number,
        default: 0
      },
      zombie: {
        type: Number,
        default: 0
      }
    },
    // Max capacity for resting (0 for unlimited)
    maxCapacity: {
      type: Number,
      default: 0
    },
    // Current number of characters resting here
    currentOccupancy: {
      type: Number,
      default: 0
    }
  },
  specialType: String,
  // Timestamps
  lastRansacked: Date,
  lastRepaired: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Define compound index for location
buildingSchema.index({ 'location.x': 1, 'location.y': 1 }, { unique: true });
// Index for queries by suburb
buildingSchema.index({ 'location.suburb': 1 });
// Index for building type queries
buildingSchema.index({ type: 1 });

// Virtual property for barricade status text with updated thresholds
buildingSchema.virtual('barricadeStatus').get(function() {
  if (this.barricadeLevel === 0) return 'not barricaded';
  if (this.barricadeLevel < 10) return 'loosely barricaded';
  if (this.barricadeLevel < 20) return 'lightly barricaded';
  if (this.barricadeLevel < 40) return 'quite strongly barricaded';
  if (this.barricadeLevel < 60) return 'very strongly barricaded';
  if (this.barricadeLevel < 80) return 'heavily barricaded';      // Level 60-79: Heavily barricaded
  if (this.barricadeLevel < 100) return 'very heavily barricaded'; // Level 80-99: Very heavily barricaded
  return 'extremely heavily barricaded';                           // Level 100+: Extremely heavily barricaded
});

// Helper method to check if building is heavily barricaded or above
buildingSchema.methods.isHeavilyBarricaded = function() {
  return this.barricadeLevel >= 60;
};

// Helper method to check if building is very heavily barricaded or above
buildingSchema.methods.isVeryHeavilyBarricaded = function() {
  return this.barricadeLevel >= 80;
};

// Methods for barricade manipulation
buildingSchema.methods.addBarricade = function(amount) {
  this.barricadeLevel += amount;
  this.updatedAt = Date.now();
  return this.save();
};

buildingSchema.methods.reduceBarricade = function(amount) {
  this.barricadeLevel = Math.max(0, this.barricadeLevel - amount);
  this.updatedAt = Date.now();
  return this.save();
};

// Method to change building state
buildingSchema.methods.changeState = function(newState) {
  this.state = newState;
  this.updatedAt = Date.now();
  if (newState === 'ransacked') {
    this.lastRansacked = Date.now();
    this.barricadeLevel = 0;
    this.doorsOpen = true;
  }
  return this.save();
};

// Get AP regeneration bonus for a specific character
buildingSchema.methods.getAPBonus = function(character) {
  if (!this.isPowered) {
    // Reduced benefit in unpowered buildings
    return this.apRegeneration.bonus * 0.5;
  }

  let bonus = this.apRegeneration.bonus;

  // Add class-specific bonuses if applicable
  if (character && character.classGroup) {
    const classGroup = character.classGroup.toLowerCase();
    if (this.apRegeneration.classBonuses[classGroup]) {
      bonus += this.apRegeneration.classBonuses[classGroup];
    }
  }

  return bonus;
};

// Check if building can accept more resting characters
buildingSchema.methods.canAcceptResting = function() {
  if (this.apRegeneration.maxCapacity === 0) {
    return true; // Unlimited capacity
  }

  return this.apRegeneration.currentOccupancy < this.apRegeneration.maxCapacity;
};

// Add a resting character
buildingSchema.methods.addRestingCharacter = function() {
  if (this.apRegeneration.maxCapacity > 0) {
    this.apRegeneration.currentOccupancy += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove a resting character
buildingSchema.methods.removeRestingCharacter = function() {
  if (this.apRegeneration.currentOccupancy > 0) {
    this.apRegeneration.currentOccupancy -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find buildings in range
buildingSchema.statics.findInRange = function(x, y, range) {
  return this.find({
    'location.x': { $gte: x - range, $lte: x + range },
    'location.y': { $gte: y - range, $lte: y + range }
  });
};

module.exports = mongoose.model('Building', buildingSchema);
