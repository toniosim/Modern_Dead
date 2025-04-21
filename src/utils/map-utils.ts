// src/utils/map-utils.ts

/**
 * Get building icon based on building type
 * @param buildingType The type of building
 * @returns Icon name from Material Icons set
 */
export function getBuildingIcon(buildingType: string): string {
  switch (buildingType) {
    case 'HOSPITAL':
      return 'local_hospital';
    case 'POLICE_DEPARTMENT':
      return 'local_police';
    case 'FIRE_STATION':
      return 'local_fire_department';
    case 'NECROTECH':
      return 'science';
    case 'MALL':
      return 'shopping_cart';
    case 'CHURCH':
    case 'CATHEDRAL':
      return 'church';
    case 'AUTO_REPAIR':
      return 'car_repair';
    case 'CINEMA':
      return 'movie';
    case 'CLUB':
      return 'nightlife';
    case 'FACTORY':
      return 'factory';
    case 'HOTEL':
      return 'hotel';
    case 'JUNKYARD':
      return 'delete';
    case 'LIBRARY':
      return 'menu_book';
    case 'MUSEUM':
      return 'museum';
    case 'PUB':
      return 'sports_bar';
    case 'SCHOOL':
      return 'school';
    case 'WAREHOUSE':
      return 'warehouse';
    case 'FORT':
      return 'security';
    case 'POWER_STATION':
      return 'power';
    case 'ZOO':
      return 'pets';
    default:
      return 'home';
  }
}

/**
 * Get nice display name for building type
 * @param buildingType The type of building
 * @returns User-friendly display name
 */
export function formatBuildingType(buildingType: string): string {
  // Replace underscores with spaces and convert to title case
  return buildingType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get color for building type
 * @param buildingType The type of building
 * @returns CSS color class
 */
export function getBuildingColorClass(buildingType: string): string {
  switch (buildingType) {
    case 'HOSPITAL':
      return 'hospital';
    case 'POLICE_DEPARTMENT':
      return 'police';
    case 'FIRE_STATION':
      return 'fire';
    case 'NECROTECH':
      return 'necrotech';
    case 'MALL':
      return 'mall';
    default:
      return buildingType.toLowerCase().replace('_', '-');
  }
}

/**
 * Get barricade status description
 * @param barricadeLevel Numeric barricade level
 * @returns Human-readable barricade status
 */
export function getBarricadeStatus(barricadeLevel: number): string {
  if (barricadeLevel === 0) {
    return 'Not barricaded';
  } else if (barricadeLevel < 20) {
    return 'Loosely barricaded';
  } else if (barricadeLevel < 40) {
    return 'Lightly barricaded';
  } else if (barricadeLevel < 60) {
    return 'Quite strongly barricaded';
  } else if (barricadeLevel < 80) {
    return 'Very strongly barricaded';
  } else if (barricadeLevel < 100) {
    return 'Heavily barricaded';
  } else if (barricadeLevel < 120) {
    return 'Very heavily barricaded';
  } else {
    return 'Extremely heavily barricaded';
  }
}

/**
 * Get barricade style class
 * @param barricadeLevel Numeric barricade level
 * @returns CSS class for barricade styling
 */
export function getBarricadeClass(barricadeLevel: number): string {
  if (barricadeLevel === 0) {
    return '';
  } else if (barricadeLevel < 40) {
    return 'barricade-light';
  } else if (barricadeLevel < 80) {
    return 'barricade-medium';
  } else {
    return 'barricade-heavy';
  }
}

/**
 * Calculate distance between two map coordinates
 * @param x1 Starting X coordinate
 * @param y1 Starting Y coordinate
 * @param x2 Ending X coordinate
 * @param y2 Ending Y coordinate
 * @returns Manhattan distance (blocks)
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Check if a location is adjacent to another
 * @param x1 First X coordinate
 * @param y1 First Y coordinate
 * @param x2 Second X coordinate
 * @param y2 Second Y coordinate
 * @returns Whether locations are adjacent
 */
export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  return (
    (Math.abs(x1 - x2) === 1 && y1 === y2) ||
    (Math.abs(y1 - y2) === 1 && x1 === x2)
  );
}

/**
 * Generate a simple map coordinate string
 * @param x X coordinate
 * @param y Y coordinate
 * @returns Formatted coordinate string [x,y]
 */
export function formatCoordinates(x: number, y: number): string {
  return `[${x}, ${y}]`;
}

/**
 * Get direction from one location to another
 * @param fromX Origin X coordinate
 * @param fromY Origin Y coordinate
 * @param toX Destination X coordinate
 * @param toY Destination Y coordinate
 * @returns Cardinal direction (N, E, S, W) or empty string if not adjacent
 */
export function getDirection(fromX: number, fromY: number, toX: number, toY: number): 'N' | 'E' | 'S' | 'W' | '' {
  if (fromX === toX && fromY > toY) return 'N';
  if (fromX < toX && fromY === toY) return 'E';
  if (fromX === toX && fromY < toY) return 'S';
  if (fromX > toX && fromY === toY) return 'W';
  return '';
}
