// server/src/models/group.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  description: {
    type: String,
    maxlength: 500
  },
  // Group type (survivor, zombie, mixed)
  type: {
    type: String,
    enum: ['survivor', 'zombie', 'mixed'],
    required: true
  },
  // Group founder
  founder: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  // Group members
  members: [{
    character: {
      type: Schema.Types.ObjectId,
      ref: 'Character',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'officer', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Group headquarters (optional)
  headquarters: {
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: 'Building'
    },
    x: Number,
    y: Number,
    suburb: {
      type: Schema.Types.ObjectId,
      ref: 'Suburb'
    }
  },
  // Radio frequency claimed by the group
  radioFrequency: {
    type: Number,
    min: 26.00,
    max: 28.00,
    unique: true,
    sparse: true
  },
  // Group statistics
  statistics: {
    kills: { type: Number, default: 0 },
    revives: { type: Number, default: 0 },
    barricadesBuilt: { type: Number, default: 0 },
    buildingsRansacked: { type: Number, default: 0 }
  },
  // Group settings
  settings: {
    isPublic: { type: Boolean, default: true },
    autoAcceptRequests: { type: Boolean, default: false },
    membershipRequirements: String
  },
  // Creation and update timestamps
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
groupSchema.index({ name: 1 }, { unique: true });
groupSchema.index({ type: 1 });
groupSchema.index({ radioFrequency: 1 }, { sparse: true });
groupSchema.index({ 'members.character': 1 });

// Method to add a member
groupSchema.methods.addMember = function(characterId, role = 'member') {
  // Check if already a member
  const isMember = this.members.some(m =>
    m.character.toString() === characterId.toString()
  );

  if (!isMember) {
    this.members.push({
      character: characterId,
      role,
      joinedAt: Date.now()
    });
    this.updatedAt = Date.now();
  }

  return this.save();
};

// Method to remove a member
groupSchema.methods.removeMember = function(characterId) {
  this.members = this.members.filter(
    m => m.character.toString() !== characterId.toString()
  );
  this.updatedAt = Date.now();
  return this.save();
};

// Method to update member role
groupSchema.methods.updateMemberRole = function(characterId, newRole) {
  const member = this.members.find(
    m => m.character.toString() === characterId.toString()
  );

  if (member) {
    member.role = newRole;
    this.updatedAt = Date.now();
  }

  return this.save();
};

// Static method to find groups a character is in
groupSchema.statics.findByMember = function(characterId) {
  return this.find({
    'members.character': characterId
  });
};

module.exports = mongoose.model('Group', groupSchema);
