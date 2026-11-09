const t=`/**
 * Sunrise and sunset in Shenzhen, worked out from the sun's position (NOAA's
 * approximation, good to a minute or two), so the desk lamp comes on at dusk
 * whatever the season, and daylight saving takes care of itself.
 */

const LAT = 22.54;
const LON = 114.06;
const rad = (deg: number) => (deg * Math.PI) / 180;
const MINUTE = 60_000;

const localDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Sunrise and sunset, as moments in time, for the Sydney calendar day \`offset\` days from \`at\`. */
function sunTimes(at: Date, offset = 0) {
  const [y, m, d] = localDate.format(at).split("-").map(Number);
  const midnightUtc = Date.UTC(y, m - 1, d + offset);
  const dayOfYear = Math.round((midnightUtc - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  // The fractional year, the equation of time (minutes) and the sun's declination.
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  // The hour angle when the sun's upper edge meets the horizon, refraction included.
  const ha =
    (Math.acos(Math.cos(rad(90.833)) / (Math.cos(rad(LAT)) * Math.cos(decl)) - Math.tan(rad(LAT)) * Math.tan(decl)) * 180) / Math.PI;
  return {
    sunrise: midnightUtc + (720 - 4 * (LON + ha) - eqTime) * MINUTE,
    sunset: midnightUtc + (720 - 4 * (LON - ha) - eqTime) * MINUTE,
  };
}

/** Whether it's dark in Sydney right now, and when that next changes. */
export function sydneyEvening(at = new Date()) {
  const now = at.getTime();
  const today = sunTimes(at);
  if (now < today.sunrise) return { evening: true, until: today.sunrise };
  if (now < today.sunset) return { evening: false, until: today.sunset };
  return { evening: true, until: sunTimes(at, 1).sunrise };
}
`;export{t as default};
