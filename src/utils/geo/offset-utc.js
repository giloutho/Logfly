const geoTz = require('geo-tz')
const ZonedDateTime = require('zoned-date-time');
const zoneData = require('iana-tz-data').zoneData;

/**
 * Wait for coordinates of a point and a Unix timestamp
 * return the offset UTC for the given point at the given time 
 */
function computeOffsetUTC(lat, lng, timest) {
  // https://github.com/evansiroky/node-geo-tz
  const coordBegin = geoTz(lat, lng, timest)
  // returns something like // ['America/Los_Angeles'] or['Asia/Shanghai', 'Asia/Urumqi']
  const arrZone = coordBegin.toString().split('/');
  let dateFirstPoint = new Date(timest)
  // https://github.com/rxaviers/zoned-date-time
  let zdt = new ZonedDateTime(dateFirstPoint, zoneData[arrZone[0]][arrZone[1]])
  let rawOffset = zdt.getTimezoneOffset()
  // The direction is reversed. getTimezoneOffset gives us the operation to be carried out to obtain the UTC time.
  // For France getTimezoneOffset result is -120mn.
  let offsetUTC = -1 * rawOffset		

  return offsetUTC
}

module.exports.computeOffsetUTC = computeOffsetUTC
