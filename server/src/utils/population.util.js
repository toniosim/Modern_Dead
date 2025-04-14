// server/src/utils/population.util.js
/**
 * Standard population paths for different models
 */
const POPULATION_PATHS = {
  character: {
    basic: 'user',
    standard: 'user location.suburb skills.skill inventory.item',
    full: 'user location.suburb location.building skills.skill inventory.item'
  },
  building: {
    basic: 'location.suburb',
    standard: 'location.suburb',
    full: 'location.suburb'
  },
  mapCell: {
    basic: 'suburb',
    standard: 'suburb building',
    full: 'suburb building entities.item'
  },
  message: {
    basic: 'sender.character',
    standard: 'sender.character location.suburb',
    full: 'sender.character location.suburb location.building recipients'
  },
  revivePoint: {
    basic: 'location.suburb',
    standard: 'location.suburb location.building',
    full: 'location.suburb location.building associatedLocations.entryPoint associatedLocations.healingPoint maintainer'
  }
};

/**
 * Apply standard population to a query
 * @param {Object} query - Mongoose query object
 * @param {String} modelName - Name of the model
 * @param {String} level - Population level: 'basic', 'standard', or 'full'
 * @returns {Object} - The query with population applied
 */
const populateQuery = (query, modelName, level = 'standard') => {
  if (!POPULATION_PATHS[modelName]) {
    return query;
  }

  const paths = POPULATION_PATHS[modelName][level] || POPULATION_PATHS[modelName].standard;

  if (!paths) {
    return query;
  }

  paths.split(' ').forEach(path => {
    query = query.populate(path);
  });

  return query;
};

module.exports = {
  populateQuery,
  POPULATION_PATHS
};
