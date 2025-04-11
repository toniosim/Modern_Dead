// server/src/utils/character-classes.util.js

// Character class definitions with their starting skills and equipment
const CHARACTER_CLASSES = {
  // Military classes
  MILITARY: {
    PRIVATE: {
      name: 'Private',
      startingSkills: ['Basic Firearms Training'],
      startingEquipment: [
        { item: 'Pistol', quantity: 1 },
        { item: 'Pistol Clip', quantity: 1 },
        { item: 'Radio', quantity: 1 }
      ],
      xpCosts: {
        military: 75,
        science: 150,
        civilian: 100,
        zombie: 100
      }
    },
    SCOUT: {
      name: 'Scout',
      startingSkills: ['Free Running'],
      startingEquipment: [
        { item: 'Flare Gun', quantity: 1 },
        { item: 'Binoculars', quantity: 1 }
      ],
      xpCosts: {
        military: 75,
        science: 150,
        civilian: 100,
        zombie: 100
      }
    },
    MEDIC: {
      name: 'Medic',
      startingSkills: ['First Aid'],
      startingEquipment: [
        { item: 'First Aid Kit', quantity: 2 }
      ],
      xpCosts: {
        military: 75,
        science: 150,
        civilian: 100,
        zombie: 100
      }
    }
  },

  // Civilian classes
  CIVILIAN: {
    FIREFIGHTER: {
      name: 'Firefighter',
      startingSkills: ['Axe Proficiency'],
      startingEquipment: [
        { item: 'Fire Axe', quantity: 1 },
        { item: 'Radio', quantity: 1 }
      ],
      xpCosts: {
        military: 100,
        science: 100,
        civilian: 100,
        zombie: 100
      }
    },
    POLICE_OFFICER: {
      name: 'Police Officer',
      startingSkills: ['Basic Firearms Training'],
      startingEquipment: [
        { item: 'Pistol', quantity: 1 },
        { item: 'Flak Jacket', quantity: 1 },
        { item: 'Radio', quantity: 1 }
      ],
      xpCosts: {
        military: 100,
        science: 100,
        civilian: 100,
        zombie: 100
      }
    },
    CONSUMER: {
      name: 'Consumer',
      startingSkills: ['Shopping'],
      startingEquipment: [
        { item: 'Random Melee Weapon', quantity: 1 },
        { item: 'Mobile Phone', quantity: 1 }
      ],
      xpCosts: {
        military: 100,
        science: 100,
        civilian: 100,
        zombie: 100
      }
    }
  },

  // Scientist classes
  SCIENTIST: {
    NECROTECH_LAB_ASSISTANT: {
      name: 'NecroTech Lab Assistant',
      startingSkills: ['NecroTech Employment'],
      startingEquipment: [
        { item: 'DNA Extractor', quantity: 1 }
      ],
      xpCosts: {
        military: 150,
        science: 75,
        civilian: 100,
        zombie: 100
      }
    },
    DOCTOR: {
      name: 'Doctor',
      startingSkills: ['Diagnosis', 'First Aid'],
      startingEquipment: [
        { item: 'First Aid Kit', quantity: 1 }
      ],
      xpCosts: {
        military: 150,
        science: 75,
        civilian: 100,
        zombie: 100
      }
    }
  },

  // Zombie class
  ZOMBIE: {
    CORPSE: {
      name: 'Corpse',
      startingSkills: ['Vigour Mortis'],
      startingEquipment: [],
      xpCosts: {
        military: 0,
        science: 0,
        civilian: 0,
        zombie: 100
      }
    }
  }
};

// Skill definitions
const SKILLS = {
  // Military skills
  'Basic Firearms Training': { category: 'military', effect: '+25% to hit with firearms attacks' },
  'Free Running': { category: 'military', effect: 'Move between adjacent buildings without going outside' },
  'Pistol Training': { category: 'military', effect: 'Allows use of pistols', prerequisite: 'Basic Firearms Training' },
  'Shotgun Training': { category: 'military', effect: 'Allows use of shotguns', prerequisite: 'Basic Firearms Training' },
  'Hand-to-Hand Combat': { category: 'military', effect: '+15% to hit with melee attacks' },
  'Axe Proficiency': { category: 'military', effect: '+10% to hit with axes', prerequisite: 'Hand-to-Hand Combat' },

  // Science skills
  'First Aid': { category: 'science', effect: 'Heal with First Aid Kits (heals additional 5 HP)' },
  'Diagnosis': { category: 'science', effect: 'Identify injured survivors by HP level' },
  'Surgery': { category: 'science', effect: 'Extra 5 HP healing with First Aid Kits', prerequisite: 'First Aid' },
  'NecroTech Employment': { category: 'science', effect: 'Operate DNA Extractors and identify NecroTech buildings' },
  'Lab Experience': { category: 'science', effect: 'Use and create revivification syringes', prerequisite: 'NecroTech Employment' },

  // Civilian skills
  'Shopping': { category: 'civilian', effect: 'Choose which stores to search in malls' },
  'Construction': { category: 'civilian', effect: 'Build and repair barricades' },
  'Body Building': { category: 'civilian', effect: 'Increase maximum HP to 60' },

  // Zombie skills
  'Vigour Mortis': { category: 'zombie', effect: '+10% to hit with non-weapon attacks' },
  'Lurching Gait': { category: 'zombie', effect: 'Move at normal speed (1 AP per move)' },
  'Death Grip': { category: 'zombie', effect: '+15% to hit with hand attacks', prerequisite: 'Vigour Mortis' }
};

// Utility functions for character creation
const getRandomSpawnLocation = (characterClass) => {
  // Simple spawn location logic based on class
  // In a real implementation, this would be more sophisticated
  const baseLocation = { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) };

  switch (characterClass) {
    case 'PRIVATE':
    case 'SCOUT':
      return { ...baseLocation, areaName: 'Military Base' };
    case 'MEDIC':
    case 'DOCTOR':
      return { ...baseLocation, areaName: 'Hospital' };
    case 'POLICE_OFFICER':
      return { ...baseLocation, areaName: 'Police Department' };
    case 'FIREFIGHTER':
      return { ...baseLocation, areaName: 'Fire Station' };
    case 'NECROTECH_LAB_ASSISTANT':
      return { ...baseLocation, areaName: 'NecroTech Building' };
    default:
      return { ...baseLocation, areaName: 'Street' };
  }
};

// Function to get random melee weapon for Consumer class
const getRandomMeleeWeapon = () => {
  const meleeWeapons = ['Baseball Bat', 'Crowbar', 'Kitchen Knife', 'Golf Club', 'Pool Cue'];
  const randomIndex = Math.floor(Math.random() * meleeWeapons.length);
  return meleeWeapons[randomIndex];
};

module.exports = {
  CHARACTER_CLASSES,
  SKILLS,
  getRandomSpawnLocation,
  getRandomMeleeWeapon
};
