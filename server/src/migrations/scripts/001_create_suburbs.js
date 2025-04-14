// server/src/migrations/scripts/001_create_suburbs.js
const mongoose = require('mongoose');
const Suburb = require('../../models/suburb.model');

module.exports = {
  async up() {
    // Create the 100 suburbs (10x10 grid)
    const suburbs = [];

    // Division and district mapping
    const getDivision = (x, y) => {
      if (x < 50 && y < 50) return 'NW';
      if (x >= 50 && y < 50) return 'NE';
      if (x < 50 && y >= 50) return 'SW';
      return 'SE';
    };

    const getDistrict = (x, y) => {
      // Calculate local position within division (0-4)
      const localX = Math.floor(x / 10) % 5;
      const localY = Math.floor(y / 10) % 5;

      // Group the 25 suburbs into 5 districts (5 suburbs per district)
      // One simple way is to group by rows
      return Math.floor((localY * 5 + localX) / 5) + 1;
    };

    // Generate suburb names - we can replace with actual UD names later
    const generateSuburbName = (x, y) => {
      // Significantly expanded lists for more combinations
      const prefixes = [
        'North', 'East', 'South', 'West', 'Old', 'New', 'Central',
        'Upper', 'Lower', 'High', 'Low', 'Mid', 'Royal', 'Grand',
        'Green', 'Red', 'Blue', 'Gold', 'Silver', 'Crystal'
      ];

      const suffixes = [
        'town', 'ville', 'burg', 'field', 'gate', 'wood', 'haven', 'port', 'shire',
        'bridge', 'cross', 'grove', 'valley', 'hill', 'dale', 'crest', 'view', 'brook',
        'land', 'side', 'creek', 'ford', 'lake', 'ridge', 'peak'
      ];

      // Use both x and y for more variety
      const prefixIndex = (x * 13 + y * 7) % prefixes.length;
      const suffixIndex = (y * 11 + x * 5) % suffixes.length;

      return `${prefixes[prefixIndex]}${suffixes[suffixIndex]}`;
    };

    // Create 100 suburbs (10x10 grid)
    for (let y = 0; y < 100; y += 10) {
      for (let x = 0; x < 100; x += 10) {
        const division = getDivision(x, y);
        const district = getDistrict(x, y);
        const name = `${generateSuburbName(x/10, y/10)}`;

        suburbs.push({
          name,
          location: { x, y },
          division,
          district,
          population: { survivors: 0, zombies: 0 },
          dangerLevel: 0
        });
      }
    }

    // Insert all suburbs
    if (suburbs.length > 0) {
      await Suburb.insertMany(suburbs);
      console.log(`Created ${suburbs.length} suburbs`);
    }
  },

  async down() {
    // Delete all suburbs
    const result = await Suburb.deleteMany({});
    console.log(`Deleted ${result.deletedCount} suburbs`);
  }
};
