const db = require('./db');

/**
 * Assignment Engine — determines the correct ward team for a ticket
 * based on GPS coordinates using simple latitude/longitude rules.
 * In production, this would use PostGIS polygon intersection.
 */
async function assignToWard(latitude, longitude) {
  // Query ward zones ordered by a simple proximity rule
  // Simple rule set matching seed data boundary descriptions:
  //   Ward 1 (North): lat > 6.55
  //   Ward 2 (Central): 6.50 <= lat <= 6.55
  //   Ward 3 (South): lat < 6.50
  //   Ward 4 (East): lon > 3.40 (overrides lat-based if in east)
  //   Ward 5 (West): lon < 3.35 (overrides lat-based if in west)

  let wardZoneId;

  if (longitude > 3.40) {
    wardZoneId = 4; // East
  } else if (longitude < 3.35) {
    wardZoneId = 5; // West
  } else if (latitude > 6.55) {
    wardZoneId = 1; // North
  } else if (latitude >= 6.50) {
    wardZoneId = 2; // Central
  } else {
    wardZoneId = 3; // South
  }

  // Fetch the ward zone and its responsible team
  const result = await db.query(
    `SELECT wz.id as zone_id, wz.name as zone_name, t.id as team_id, t.name as team_name
     FROM ward_zones wz
     JOIN teams t ON wz.responsible_team_id = t.id
     WHERE wz.id = $1`,
    [wardZoneId]
  );

  if (result.rows.length === 0) {
    // Fallback: assign to first available team
    const fallback = await db.query('SELECT id, name FROM teams ORDER BY id LIMIT 1');
    return fallback.rows[0] ? { team_id: fallback.rows[0].id, team_name: fallback.rows[0].name, zone_id: null } : null;
  }

  return {
    zone_id: result.rows[0].zone_id,
    zone_name: result.rows[0].zone_name,
    team_id: result.rows[0].team_id,
    team_name: result.rows[0].team_name,
  };
}

module.exports = { assignToWard };
