// server/src/models/character.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { CHARACTER_CLASSES, SKILLS, getRandomSpawnLocation } = require('../utils/character-classes.util');

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
  // Base type (survivor/zombie)
  type: {
    type: String,
    enum: ['survivor', 'zombie'],
    required: true
  },
  // Character class group
  classGroup: {
    type: String,
    enum: ['MILITARY', 'CIVILIAN', 'SCIENTIST', 'ZOMBIE'],
    required: true
  },
  // Specific subclass
  subClass: {
    type: String,
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
  // Flag for infection status
  infected: {
    type: Boolean,
    default: false
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
  // Items in character's inventory
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
  // Character skills
  skills: [{
    name: String,
    level: {
      type: Number,
      default: 1
    },
    // Whether the skill is active (based on character state)
    active: {
      type: Boolean,
      default: true
    }
  }],
  // Action points
  actions: {
    availableActions: {
      type: Number,
      default: 50
    },
    lastActionTime: {
      type: Date,
      default: Date.now
    },
    // Regeneration rate (AP per hour)
    regenerationRate: {
      type: Number,
      default: 1
    }
  },
  // XP cost modifiers based on class
  xpCosts: {
    military: Number,
    science: Number,
    civilian: Number,
    zombie: Number
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
  return this.type === 'survivor' && this.health.current > 0;
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

  // Update character type
  this.type = newType;

  // Update skill active status based on new type
  this.skills.forEach(skill => {
    const skillInfo = SKILLS[skill.name];
    if (skillInfo) {
      // Survivor skills are only active when alive
      if (skillInfo.category !== 'zombie') {
        skill.active = newType === 'survivor';
      }
      // Zombie skills are only active when dead
      else {
        skill.active = newType === 'zombie';
      }
    }
  });

  return this.save();
};

// Method to add a skill
characterSchema.methods.addSkill = function(skillName) {
  // Check if skill exists
  const skillInfo = SKILLS[skillName];
  if (!skillInfo) {
    throw new Error(`Skill "${skillName}" does not exist`);
  }

  // Check if character already has this skill
  const existingSkill = this.skills.find(s => s.name === skillName);
  if (existingSkill) {
    throw new Error(`Character already has the skill "${skillName}"`);
  }

  // Check prerequisites
  if (skillInfo.prerequisite) {
    const hasPrerequisite = this.skills.some(s => s.name === skillInfo.prerequisite);
    if (!hasPrerequisite) {
      throw new Error(`Prerequisite skill "${skillInfo.prerequisite}" required for "${skillName}"`);
    }
  }

  // Calculate XP cost based on character class
  const xpCost = this.xpCosts[skillInfo.category] || 100;

  // Check if character has enough XP
  if (this.experience < xpCost) {
    throw new Error(`Not enough XP to learn "${skillName}" (${xpCost} XP required)`);
  }

  // Add skill and deduct XP
  this.skills.push({
    name: skillName,
    level: 1,
    active: (this.type === 'survivor' && skillInfo.category !== 'zombie') ||
      (this.type === 'zombie' && skillInfo.category === 'zombie')
  });

  this.experience -= xpCost;
  this.level = Math.max(this.level, this.skills.length);

  return this.save();
};

// Method to handle character death
characterSchema.methods.die = function() {
  if (this.type === 'zombie') {
    throw new Error('Character is already dead');
  }

  // Set health to 0
  this.health.current = 0;

  // Change type to zombie
  return this.changeType('zombie');
};

// Method to revive a zombie
characterSchema.methods.revive = function() {
  if (this.type === 'survivor') {
    throw new Error('Character is already alive');
  }

  // Set health to 50% of max (or affected by Body Building skill)
  const hasBodyBuilding = this.skills.some(s => s.name === 'Body Building');
  this.health.max = hasBodyBuilding ? 60 : 50;
  this.health.current = Math.floor(this.health.max / 2);

  // Change type to survivor
  return this.changeType('survivor');
};

// Static method to create a new character with class-specific setup
characterSchema.statics.createCharacter = async function(userData) {
  const { user, name, classGroup, subClass } = userData;

  // Validate class and subclass
  if (!CHARACTER_CLASSES[classGroup] || !CHARACTER_CLASSES[classGroup][subClass]) {
    throw new Error('Invalid character class or subclass');
  }

  // Get class definition
  const classDefinition = CHARACTER_CLASSES[classGroup][subClass];

  // Determine initial type based on class (only Corpse starts as zombie)
  const initialType = classGroup === 'ZOMBIE' ? 'zombie' : 'survivor';

  // Generate spawn location based on class
  const spawnLocation = getRandomSpawnLocation(subClass);

  // Create character
  const character = new this({
    user,
    name,
    type: initialType,
    classGroup,
    subClass,
    xpCosts: classDefinition.xpCosts,
    health: {
      current: initialType === 'survivor' ? 50 : 0,
      max: 50
    },
    location: spawnLocation
  });

  // Add starting skills
  classDefinition.startingSkills.forEach(skillName => {
    character.skills.push({
      name: skillName,
      level: 1,
      active: (initialType === 'survivor' && SKILLS[skillName].category !== 'zombie') ||
        (initialType === 'zombie' && SKILLS[skillName].category === 'zombie')
    });
  });

  // Initialize inventory with starting equipment
  // In a real implementation, you would look up actual Item documents from the database
  // For now, we'll just use placeholder IDs
  character.inventory = classDefinition.startingEquipment.map(item => ({
    item: new mongoose.Types.ObjectId(), // Placeholder, should be a real Item _id
    quantity: item.quantity
  }));

  await character.save();
  return character;
};

module.exports = mongoose.model('Character', characterSchema);
