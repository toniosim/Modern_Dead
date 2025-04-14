// server/src/migrations/scripts/002_seed_skills.js
const Skill = require('../../models/skill.model');

module.exports = {
  async up() {
    // Define all skills in the game
    const skills = [
      // Military skills
      {
        name: 'Basic Firearms Training',
        category: 'military',
        description: 'Basic training in the use of firearms',
        effect: '+25% to hit with firearms attacks',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 100
      },
      {
        name: 'Pistol Training',
        category: 'military',
        description: 'Specialized training with pistols',
        effect: 'Allows use of pistols',
        prerequisite: 'Basic Firearms Training',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 110
      },
      {
        name: 'Shotgun Training',
        category: 'military',
        description: 'Specialized training with shotguns',
        effect: 'Allows use of shotguns',
        prerequisite: 'Basic Firearms Training',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 120
      },
      {
        name: 'Free Running',
        category: 'military',
        description: 'Ability to move quickly through urban environments',
        effect: 'Move between adjacent buildings without going outside',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 130
      },
      {
        name: 'Hand-to-Hand Combat',
        category: 'military',
        description: 'Training in unarmed combat',
        effect: '+15% to hit with melee attacks',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 140
      },
      {
        name: 'Axe Proficiency',
        category: 'military',
        description: 'Specialized training with axes',
        effect: '+10% to hit with axes',
        prerequisite: 'Hand-to-Hand Combat',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 150
      },

      // Science skills
      {
        name: 'First Aid',
        category: 'science',
        description: 'Basic medical training',
        effect: 'Heal with First Aid Kits (heals additional 5 HP)',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 200
      },
      {
        name: 'Diagnosis',
        category: 'science',
        description: 'Ability to assess injuries',
        effect: 'Identify injured survivors by HP level',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 210
      },
      {
        name: 'Surgery',
        category: 'science',
        description: 'Advanced medical training',
        effect: 'Extra 5 HP healing with First Aid Kits',
        prerequisite: 'First Aid',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 220
      },
      {
        name: 'NecroTech Employment',
        category: 'science',
        description: 'Training in NecroTech procedures',
        effect: 'Operate DNA Extractors and identify NecroTech buildings',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 230
      },
      {
        name: 'Lab Experience',
        category: 'science',
        description: 'Experience working in NecroTech labs',
        effect: 'Use and create revivification syringes',
        prerequisite: 'NecroTech Employment',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 240
      },

      // Civilian skills
      {
        name: 'Shopping',
        category: 'civilian',
        description: 'Knowledge of retail environments',
        effect: 'Choose which stores to search in malls',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 300
      },
      {
        name: 'Construction',
        category: 'civilian',
        description: 'Knowledge of building construction',
        effect: 'Build and repair barricades',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 310
      },
      {
        name: 'Body Building',
        category: 'civilian',
        description: 'Physical conditioning',
        effect: 'Increase maximum HP to 60',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 320
      },
      {
        name: 'Tagging',
        category: 'civilian',
        description: 'Skill with spray paint',
        effect: 'Leave spray-painted messages',
        usableBySurvivors: true,
        usableByZombies: false,
        displayOrder: 330
      },

      // Zombie skills
      {
        name: 'Vigour Mortis',
        category: 'zombie',
        description: 'Enhanced zombie strength',
        effect: '+10% to hit with non-weapon attacks',
        usableBySurvivors: false,
        usableByZombies: true,
        displayOrder: 400
      },
      {
        name: 'Lurching Gait',
        category: 'zombie',
        description: 'Improved zombie mobility',
        effect: 'Move at normal speed (1 AP per move)',
        usableBySurvivors: false,
        usableByZombies: true,
        displayOrder: 410
      },
      {
        name: 'Death Grip',
        category: 'zombie',
        description: 'Powerful grasp',
        effect: '+15% to hit with hand attacks',
        prerequisite: 'Vigour Mortis',
        usableBySurvivors: false,
        usableByZombies: true,
        displayOrder: 420
      },
      {
        name: 'Scent Fear',
        category: 'zombie',
        description: 'Detect the smell of fear',
        effect: 'Identify wounded survivors',
        usableBySurvivors: false,
        usableByZombies: true,
        displayOrder: 430
      },
      {
        name: 'Death Rattle',
        category: 'zombie',
        description: 'Limited speech capability',
        effect: 'Basic zombie communication',
        usableBySurvivors: false,
        usableByZombies: true,
        displayOrder: 440
      }
    ];

    // Insert skills
    if (skills.length > 0) {
      await Skill.insertMany(skills);
      console.log(`Seeded ${skills.length} skills`);
    }
  },

  async down() {
    // Remove all skills
    const result = await Skill.deleteMany({});
    console.log(`Removed ${result.deletedCount} skills`);
  }
};
