/**
 * Pin the timezone the tests run in.
 *
 * Without this the suite runs in whatever zone the machine is set to, so a
 * developer in Berlin and CI in UTC run materially different tests. Date
 * handling is exactly where that matters: `services/flowRing.ts` had a defect
 * that was invisible at offset zero, because a local month bound formatted as
 * UTC only shifts when the offset is not zero.
 *
 * This runs in Jest's parent process, before any worker is spawned, so each
 * worker inherits TZ in its environment and initialises its timezone from it at
 * startup. Setting `process.env.TZ` from inside a test file does not work: on
 * Linux, Node has already cached the zone by the time `beforeAll` runs, so the
 * assignment is silently ignored and timezone-sensitive tests pass for the
 * wrong reason. That is precisely how this was found -- the guard case in
 * `services/__tests__/flowRingTimezone.test.ts` failed on CI while the four
 * cases it guards passed vacuously.
 *
 * Any zone with a non-zero offset and a DST transition would do; Europe/Berlin
 * is the one the defect was reproduced in.
 */
module.exports = () => {
  process.env.TZ = "Europe/Berlin";
};
