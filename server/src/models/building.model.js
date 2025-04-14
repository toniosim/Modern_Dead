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
  // For special buildings
  isRevivePoint: {
    type: Boolean,
    default: false
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

// Virtual property for barricade status text
buildingSchema.virtual('barricadeStatus').get(function() {
  if (this.barricadeLevel === 0) return 'not barricaded';
  if (this.barricadeLevel < 20) return 'loosely barricaded';
  if (this.barricadeLevel < 40) return 'lightly barricaded';
  if (this.barricadeLevel < 60) return 'quite strongly barricaded';
  if (this.barricadeLevel < 80) return 'very strongly barricaded';
  if (this.barricadeLevel < 100) return 'heavily barricaded';
  if (this.barricadeLevel < 120) return 'very heavily barricaded';
  return 'extremely heavily barricaded';
});

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

// Static method to find buildings in range
buildingSchema.statics.findInRange = function(x, y, range) {
  return this.find({
    'location.x': { $gte: x - range, $lte: x + range },
    'location.y': { $gte: y - range, $lte: y + range }
  });
};

module.exports = mongoose.model('Building', buildingSchema);
