const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mapCellSchema = new Schema({
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 99
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 99
  },
  // The type of cell (street, building, etc.)
  type: {
    type: String,
    enum: ['street', 'building'],
    required: true
  },
  // Reference to building if type is 'building'
  building: {
    type: Schema.Types.ObjectId,
    ref: 'Building',
    default: null
  },
  // Reference to suburb
  suburb: {
    type: Schema.Types.ObjectId,
    ref: 'Suburb',
    required: true
  },
  // Whether the cell is passable
  isPassable: {
    type: Boolean,
    default: true
  },
  // Properties specific to this cell
  properties: {
    type: Schema.Types.Mixed,
    default: {}
  },
  // Entities (items, graffiti) in this location
  entities: [{
    type: {
      type: String,
      enum: ['item', 'graffiti', 'corpse']
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: 'Item'
    },
    quantity: Number,
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Compound index for faster lookups
mapCellSchema.index({ x: 1, y: 1 }, { unique: true });
// Index for suburb lookups
mapCellSchema.index({ suburb: 1 });

// Method to add entity to cell
mapCellSchema.methods.addEntity = function(entityData) {
  this.entities.push({
    type: entityData.type,
    item: entityData.item || null,
    quantity: entityData.quantity || 1,
    message: entityData.message || '',
    createdAt: Date.now()
  });
  return this.save();
};

// Method to remove entity from cell
mapCellSchema.methods.removeEntity = function(entityId) {
  this.entities = this.entities.filter(
    entity => entity._id.toString() !== entityId.toString()
  );
  return this.save();
};

// Static method to get cells in area
mapCellSchema.statics.getArea = function(centerX, centerY, radius = 1) {
  const minX = Math.max(0, centerX - radius);
  const maxX = Math.min(99, centerX + radius);
  const minY = Math.max(0, centerY - radius);
  const maxY = Math.min(99, centerY + radius);

  return this.find({
    x: { $gte: minX, $lte: maxX },
    y: { $gte: minY, $lte: maxY }
  }).populate('building').populate('suburb');
};

module.exports = mongoose.model('MapCell', mapCellSchema);
