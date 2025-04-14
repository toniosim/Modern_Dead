// server/src/models/skill.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const skillSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['military', 'science', 'civilian', 'zombie'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  effect: {
    type: String,
    required: true
  },
  // Optional skill prerequisite
  prerequisite: {
    type: String,
    default: null
  },
  // Can be used by survivors?
  usableBySurvivors: {
    type: Boolean,
    default: false
  },
  // Can be used by zombies?
  usableByZombies: {
    type: Boolean,
    default: false
  },
  // Game mechanics data
  mechanics: {
    type: Schema.Types.Mixed,
    default: {}
  },
  // Order for display in skill tree
  displayOrder: {
    type: Number,
    default: 0
  }
});

// Indexes
skillSchema.index({ category: 1 });
skillSchema.index({ prerequisite: 1 });

// Method to check if a character can learn this skill
skillSchema.methods.canBeLearnedBy = function(character) {
  // First check if the character is the right type
  if (character.type === 'survivor' && !this.usableBySurvivors) {
    return { canLearn: false, reason: 'Survivors cannot learn this skill' };
  }
  if (character.type === 'zombie' && !this.usableByZombies) {
    return { canLearn: false, reason: 'Zombies cannot learn this skill' };
  }

  // Check if character already has the skill
  const hasSkill = character.skills.some(skill => skill.name === this.name);
  if (hasSkill) {
    return { canLearn: false, reason: 'Already knows this skill' };
  }

  // Check prerequisite
  if (this.prerequisite) {
    const hasPrerequisite = character.skills.some(skill => skill.name === this.prerequisite);
    if (!hasPrerequisite) {
      return {
        canLearn: false,
        reason: `Missing prerequisite skill: ${this.prerequisite}`
      };
    }
  }

  // Check if character has enough XP
  const xpCost = character.xpCosts[this.category] || 100;
  if (character.experience < xpCost) {
    return {
      canLearn: false,
      reason: `Not enough XP. Needs ${xpCost}, has ${character.experience}`
    };
  }

  return { canLearn: true };
};

module.exports = mongoose.model('Skill', skillSchema);
