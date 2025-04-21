const mongoose = require('mongoose');
const MapCell = require('../../models/map.model');
const Suburb = require('../../models/suburb.model');
const Building = require('../../models/building.model');

// Building type distribution with approximate Malton percentages
const BUILDING_TYPES = {
  'AUTO_REPAIR': { weight: 4.2, size: 1 },       // ~238 in Malton
  'CHURCH': { weight: 4.4, size: 1 },            // ~249 in Malton
  'CINEMA': { weight: 3.9, size: 1 },            // ~221 in Malton
  'CLUB': { weight: 4.1, size: 1 },              // ~235 in Malton
  'FACTORY': { weight: 4.0, size: 1 },           // ~227 in Malton
  'FIRE_STATION': { weight: 1.1, size: 1 },      // ~65 in Malton
  'HOSPITAL': { weight: 1.1, size: 1 },          // ~65 in Malton
  'HOTEL': { weight: 2.5, size: 1 },             // ~145 in Malton
  'JUNKYARD': { weight: 4.6, size: 1 },          // ~262 in Malton
  'LIBRARY': { weight: 2.0, size: 1 },           // ~115 in Malton
  'MUSEUM': { weight: 1.5, size: 1 },            // ~85 in Malton
  'NECROTECH': { weight: 3.7, size: 1 },         // ~211 in Malton
  'POLICE_DEPARTMENT': { weight: 1.1, size: 1 }, // ~65 in Malton
  'PUB': { weight: 4.4, size: 1 },               // ~250 in Malton
  'SCHOOL': { weight: 2.2, size: 1 },            // ~125 in Malton
  'WAREHOUSE': { weight: 4.7, size: 1 },         // ~268 in Malton
  'MALL': { weight: 0.4, size: 4 },              // ~20 in Malton (2x2)
  'MANSION': { weight: 0.2, size: 4 },           // ~10 in Malton (2x2)
  'CATHEDRAL': { weight: 0.1, size: 1 },         // 5 in Malton (special churches)
  'STADIUM': { weight: 0.1, size: 4 },           // 3 in Malton (2x2)
  'FORT': { weight: 0.04, size: 9 },             // 2 in Malton (3x3)
  'POWER_STATION': { weight: 0.04, size: 4 },    // 2 in Malton (2x2)
  'ZOO': { weight: 0.02, size: 4 }               // 1 in Malton (2x2)
};

// Percentage of cells that should be buildings (approx 57.14%)
const BUILDING_PERCENTAGE = 57.14;

// Function to randomly select a building type based on weights
function selectBuildingType() {
  // Calculate total weight
  const totalWeight = Object.values(BUILDING_TYPES).reduce((sum, type) => sum + type.weight, 0);

  // Random number between 0 and totalWeight
  let random = Math.random() * totalWeight;

  // Find the selected building type
  for (const [type, data] of Object.entries(BUILDING_TYPES)) {
    random -= data.weight;
    if (random <= 0) {
      return type;
    }
  }

  // Fallback to a common type
  return 'WAREHOUSE';
}

// Generate a building name based on type
function generateBuildingName(type, suburbName, index) {
  const prefixes = [
    'North', 'East', 'South', 'West', 'Central', 'Downtown',
    'Uptown', 'Old', 'New', 'Grand', 'Royal', 'City', 'Metro'
  ];

  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];

  switch (type) {
    case 'AUTO_REPAIR':
      return `${randomPrefix} Auto Shop`;
    case 'CHURCH':
      return `St. ${['Mary', 'John', 'Peter', 'Paul', 'Andrew'][index % 5]}'s Church`;
    case 'CINEMA':
      return `${suburbName} Cinema`;
    case 'CLUB':
      return `The ${['Blue', 'Red', 'Black', 'White', 'Silver'][index % 5]} Club`;
    case 'HOSPITAL':
      return `${suburbName} Hospital`;
    case 'NECROTECH':
      return `NT Building #${10000 + index}`;
    case 'POLICE_DEPARTMENT':
      return `${suburbName} PD`;
    case 'MALL':
      return `${suburbName} Mall`;
    case 'CATHEDRAL':
      return `${suburbName} Cathedral`;
    case 'FORT':
      return `Fort ${['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'][index % 5]}`;
    default:
      return `${type.charAt(0) + type.slice(1).toLowerCase()} #${index}`;
  }
}

// Check if a position is valid for a building of given size
function isValidBuildingPosition(buildingMap, x, y, size) {
  // If it's a 1x1 building, just check that cell
  if (size === 1) {
    return !buildingMap.has(`${x},${y}`);
  }

  // For larger buildings, check that the entire footprint is available
  const width = Math.sqrt(size);
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < width; j++) {
      if (x + i >= 100 || y + j >= 100 || buildingMap.has(`${x+i},${y+j}`)) {
        return false;
      }
    }
  }

  return true;
}

// Record a building's footprint on the map
function markBuildingFootprint(buildingMap, x, y, size) {
  // If it's a 1x1 building, just mark that cell
  if (size === 1) {
    buildingMap.set(`${x},${y}`, true);
    return;
  }

  // For larger buildings, mark the entire footprint
  const width = Math.sqrt(size);
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < width; j++) {
      buildingMap.set(`${x+i},${y+j}`, true);
    }
  }
}

// Main migration function
module.exports = {
  async up() {
    try {
      console.log('Starting map generation...');

      // Get all suburbs
      const suburbs = await Suburb.find().lean();
      if (suburbs.length === 0) {
        throw new Error('No suburbs found. Run the create_suburbs migration first.');
      }
      console.log(`Found ${suburbs.length} suburbs`);

      // Create a suburb lookup by coordinates
      const suburbLookup = {};
      suburbs.forEach(suburb => {
        const key = `${suburb.location.x},${suburb.location.y}`;
        suburbLookup[key] = suburb;
      });

      // Calculate how many buildings we want in total
      const totalCells = 10000; // 100x100 grid
      const targetBuildingCount = Math.floor(totalCells * BUILDING_PERCENTAGE / 100);
      console.log(`Target building count: ${targetBuildingCount}`);

      // Map to track where buildings are placed
      const buildingMap = new Map();

      // Arrays to store documents for bulk insert
      const buildingDocs = [];
      const mapCellDocs = [];

      // First pass: create all streets
      console.log('Creating street cells...');
      for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
          // Find which suburb this cell belongs to
          const suburbX = Math.floor(x / 10) * 10;
          const suburbY = Math.floor(y / 10) * 10;
          const suburb = suburbLookup[`${suburbX},${suburbY}`];

          if (!suburb) {
            throw new Error(`No suburb found for coordinates (${x}, ${y})`);
          }

          // Create a street cell (will be overwritten for buildings later)
          mapCellDocs.push({
            x,
            y,
            type: 'street',
            suburb: suburb._id,
            isPassable: true
          });
        }
      }

      // Special buildings placement (hospitals, police stations, etc.)
      console.log('Placing special buildings...');

      // Each suburb should have at least one of each key service building
      const keyServices = ['HOSPITAL', 'POLICE_DEPARTMENT', 'FIRE_STATION', 'NECROTECH'];

      // For each suburb
      let buildingCounter = 0;
      for (const suburb of suburbs) {
        const suburbX = suburb.location.x;
        const suburbY = suburb.location.y;

        // Place key service buildings near the center of each suburb
        for (let i = 0; i < keyServices.length; i++) {
          const serviceType = keyServices[i];

          // Try to place near the center with some randomness
          const offsetX = 2 + Math.floor(Math.random() * 6); // 2-7
          const offsetY = 2 + Math.floor(Math.random() * 6); // 2-7

          const x = suburbX + offsetX;
          const y = suburbY + offsetY;

          // Skip if position already has a building
          if (buildingMap.has(`${x},${y}`)) {
            continue;
          }

          // Create building
          const buildingName = generateBuildingName(serviceType, suburb.name, buildingCounter);

          const building = {
            name: buildingName,
            type: serviceType,
            size: { width: 1, height: 1 },
            state: 'normal',
            isPowered: Math.random() > 0.7, // 30% chance of being powered
            barricadeLevel: Math.floor(Math.random() * 30), // 0-29
            doorsOpen: Math.random() > 0.3, // 70% chance doors are open
            location: {
              x,
              y,
              suburb: suburb._id
            },
            properties: {}
          };

          // For special buildings
          if (serviceType === 'HOSPITAL') {
            building.properties.bedsAvailable = Math.floor(Math.random() * 10) + 5;
          } else if (serviceType === 'NECROTECH') {
            building.isRevivePoint = Math.random() > 0.7; // 30% chance of being a revive point
          }

          // Create a new ObjectId for the building
          const buildingId = new mongoose.Types.ObjectId();

          // Add _id to building
          building._id = buildingId;

          // Add to array for bulk insert
          buildingDocs.push(building);

          // Update the corresponding map cell
          const cellIndex = y * 100 + x;
          mapCellDocs[cellIndex] = {
            x,
            y,
            type: 'building',
            building: buildingId,
            suburb: suburb._id,
            isPassable: true
          };

          // Mark position as taken
          buildingMap.set(`${x},${y}`, true);
          buildingCounter++;
        }
      }

      // Second pass: distribute remaining buildings
      console.log('Distributing remaining buildings...');

      // Place special multi-cell buildings first
      const largeBuildingTypes = ['MALL', 'STADIUM', 'FORT', 'MANSION', 'POWER_STATION', 'ZOO'];

      for (const type of largeBuildingTypes) {
        const size = BUILDING_TYPES[type].size;
        const count = Math.ceil(targetBuildingCount * BUILDING_TYPES[type].weight / 100);

        console.log(`Placing ${count} ${type} buildings (size: ${size})`);

        for (let i = 0; i < count; i++) {
          // Try multiple random positions until we find a valid one
          let maxAttempts = 100;
          let placed = false;

          while (maxAttempts > 0 && !placed) {
            // Pick a random position
            const x = Math.floor(Math.random() * (100 - Math.sqrt(size)));
            const y = Math.floor(Math.random() * (100 - Math.sqrt(size)));

            // Find which suburb this cell belongs to
            const suburbX = Math.floor(x / 10) * 10;
            const suburbY = Math.floor(y / 10) * 10;
            const suburb = suburbLookup[`${suburbX},${suburbY}`];

            if (!suburb) {
              maxAttempts--;
              continue;
            }

            // Check if position is valid for this building size
            if (isValidBuildingPosition(buildingMap, x, y, size)) {
              // Create building
              const buildingName = generateBuildingName(type, suburb.name, buildingCounter);
              const width = Math.sqrt(size);

              const building = {
                name: buildingName,
                type,
                size: { width, height: width },
                state: 'normal',
                isPowered: Math.random() > 0.7, // 30% chance of being powered
                barricadeLevel: Math.floor(Math.random() * 30), // 0-29
                doorsOpen: Math.random() > 0.3, // 70% chance doors are open
                location: {
                  x,
                  y,
                  suburb: suburb._id
                },
                properties: {}
              };

              // Create a new ObjectId for the building
              const buildingId = new mongoose.Types.ObjectId();

              // Add _id to building
              building._id = buildingId;

              // Add to array for bulk insert
              buildingDocs.push(building);

              // Mark all cells in the building's footprint
              markBuildingFootprint(buildingMap, x, y, size);

              // Update the corresponding map cells
              for (let dx = 0; dx < width; dx++) {
                for (let dy = 0; dy < width; dy++) {
                  const cellX = x + dx;
                  const cellY = y + dy;
                  const cellIndex = cellY * 100 + cellX;

                  mapCellDocs[cellIndex] = {
                    x: cellX,
                    y: cellY,
                    type: 'building',
                    building: buildingId,
                    suburb: suburb._id,
                    isPassable: true,
                    properties: {
                      isMainCell: dx === 0 && dy === 0 // Main cell is top-left
                    }
                  };
                }
              }

              placed = true;
              buildingCounter++;
            }

            maxAttempts--;
          }
        }
      }

      // Fill remaining spaces with standard buildings
      console.log('Filling remaining spaces with standard buildings...');

      const remainingBuildingsToPlace = targetBuildingCount - buildingCounter;
      console.log(`Placing ${remainingBuildingsToPlace} additional standard buildings...`);

      // Keep track of how many we've placed
      let placedCount = 0;
      let attempts = 0;
      const maxAttempts = remainingBuildingsToPlace * 10; // Allow 10 attempts per building on average

      while (placedCount < remainingBuildingsToPlace && attempts < maxAttempts) {
        // Pick a random position
        const x = Math.floor(Math.random() * 100);
        const y = Math.floor(Math.random() * 100);

        // Skip if position already has a building
        if (buildingMap.has(`${x},${y}`)) {
          attempts++;
          continue;
        }

        // Find which suburb this cell belongs to
        const suburbX = Math.floor(x / 10) * 10;
        const suburbY = Math.floor(y / 10) * 10;
        const suburb = suburbLookup[`${suburbX},${suburbY}`];

        if (!suburb) {
          attempts++;
          continue;
        }

        // Select a standard (1x1) building type
        let buildingType;
        do {
          buildingType = selectBuildingType();
        } while (BUILDING_TYPES[buildingType].size > 1);

        // Create building
        const buildingName = generateBuildingName(buildingType, suburb.name, buildingCounter);

        const building = {
          name: buildingName,
          type: buildingType,
          size: { width: 1, height: 1 },
          state: 'normal',
          isPowered: Math.random() > 0.7, // 30% chance of being powered
          barricadeLevel: Math.floor(Math.random() * 30), // 0-29
          doorsOpen: Math.random() > 0.3, // 70% chance doors are open
          location: {
            x,
            y,
            suburb: suburb._id
          },
          properties: {}
        };

        // Create a new ObjectId for the building
        const buildingId = new mongoose.Types.ObjectId();

        // Add _id to building
        building._id = buildingId;

        // Add to array for bulk insert
        buildingDocs.push(building);

        // Update the corresponding map cell
        const cellIndex = y * 100 + x;
        mapCellDocs[cellIndex] = {
          x,
          y,
          type: 'building',
          building: buildingId,
          suburb: suburb._id,
          isPassable: true
        };

        // Mark position as taken
        buildingMap.set(`${x},${y}`, true);
        placedCount++;
        buildingCounter++;
      }

      console.log(`Placed ${placedCount} of ${remainingBuildingsToPlace} additional buildings`);
      console.log(`Total buildings placed: ${buildingCounter}`);

      // Bulk insert all documents
      console.log('Inserting buildings into database...');
      if (buildingDocs.length > 0) {
        await Building.insertMany(buildingDocs);
      }

      console.log('Inserting map cells into database...');
      if (mapCellDocs.length > 0) {
        await MapCell.insertMany(mapCellDocs);
      }

      console.log('Map generation complete!');
      return { buildings: buildingDocs.length, mapCells: mapCellDocs.length };
    } catch (error) {
      console.error('Error generating map:', error);
      throw error;
    }
  },

  async down() {
    try {
      console.log('Removing generated map...');

      // Delete all map cells and buildings
      const deleteMapCells = await MapCell.deleteMany({});
      const deleteBuildings = await Building.deleteMany({});

      console.log(`Deleted ${deleteMapCells.deletedCount} map cells and ${deleteBuildings.deletedCount} buildings`);

      return {
        mapCells: deleteMapCells.deletedCount,
        buildings: deleteBuildings.deletedCount
      };
    } catch (error) {
      console.error('Error removing map:', error);
      throw error;
    }
  }
};
