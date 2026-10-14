import { projectById } from './catalog';
import type { CivicActionCategory } from './livingTypes';
import type { CityState, DistrictId } from './types';

export interface CityLocationSelection {
  section: CivicActionCategory | 'projects' | 'economy';
  id?: string;
  districtId?: DistrictId;
}
export interface CityLocation {
  districtId?: DistrictId;
  position?: [number, number];
}
type WorldPosition = readonly [number, number];
const point = (x: number, z: number): WorldPosition => Object.freeze([x, z] as const);

export const CITY_DISTRICT_POSITIONS: Readonly<Record<DistrictId, WorldPosition>> = Object.freeze({
  riverside: point(-40, 29), oldtown: point(-40, -29), market: point(40, 29), hillview: point(40, -29),
});
// These parcels match CivicLandmarks and LivingCityWorld without loading React.
export const CITY_PROJECT_POSITIONS: Readonly<Record<string, WorldPosition>> = Object.freeze({
  riverside_rain_garden: point(-78, 16), riverside_health_stop: point(-78, 32),
  riverside_boardwalk: point(-43, 64), riverside_play_garden: point(-25, 64),
  oldtown_clinic: point(-78, -32), oldtown_safe_lanes: point(-78, -48),
  oldtown_learning: point(-43, -64), oldtown_housing: point(-25, -64),
  market_incubator: point(78, 16), market_logistics: point(78, 32),
  market_reuse: point(43, 64), market_square: point(25, 64),
  hillview_school: point(78, -32), hillview_bus: point(78, -48),
  hillview_center: point(43, -64), hillview_crossings: point(25, -64),
});
export const CITY_ASSET_POSITIONS: Readonly<Record<string, WorldPosition>> = Object.freeze({
  riverside_bridge: point(0, 24), riverside_drainage: point(-51.6, 18),
  oldtown_power: point(-59.5, -30), market_drainage: point(51.6, 18), hillview_power: point(59.5, -30),
});

/** Resolve existing records, including healthy assets and completed projects.
 * A stale district hint never overrides a recognized record's real district.
 * Every result contains fresh coordinates; neither state nor tables are mutable
 * through the return value. Unknown IDs only use an explicit district fallback. */
export function locateCitySelection(state: CityState, selection: CityLocationSelection): CityLocation {
  const at = (districtId?: DistrictId, position?: WorldPosition): CityLocation => {
    if (!districtId || !Object.hasOwn(CITY_DISTRICT_POSITIONS, districtId)) return {};
    const coordinates = position ?? CITY_DISTRICT_POSITIONS[districtId];
    return { districtId, position: [coordinates[0], coordinates[1]] };
  };
  const district = (id?: string): CityLocation | undefined => {
    const record = state.living.districts.find(item => item.id === id);
    return record ? at(record.id) : undefined;
  };
  const asset = (id?: string): CityLocation | undefined => {
    const record = state.living.assets.find(item => item.id === id);
    return record ? at(record.districtId, CITY_ASSET_POSITIONS[record.id]) : undefined;
  };
  const project = (id?: string): CityLocation | undefined => {
    const definition = id && Object.hasOwn(projectById, id) ? projectById[id] : undefined;
    return definition ? at(definition.district, CITY_PROJECT_POSITIONS[definition.id]) : undefined;
  };
  const motion = (id?: string): CityLocation | undefined => {
    const record = state.living.council.motions.find(item => item.id === id);
    return record ? at(record.districtId) : undefined;
  };
  const service = (id?: string): CityLocation | undefined => {
    if (!id) return undefined;
    const [districtId, kind] = id.split(':');
    const record = state.living.districts.find(item => item.id === districtId);
    return record && (!kind || record.services.some(item => item.kind === kind)) ? at(record.id) : undefined;
  };
  const work = (id?: string): CityLocation | undefined => {
    const record = state.living.works.find(item => item.id === id);
    if (!record) return undefined;
    return (record.kind === 'repair' ? asset(record.targetId) : motion(record.targetId)) ?? at(record.districtId);
  };
  const { section, id } = selection;
  let found: CityLocation | undefined;
  if (id) {
    if (section === 'infrastructure') found = asset(id);
    else if (section === 'projects' || section === 'construction') found = project(id) ?? work(id);
    else if (section === 'residents') {
      const citizen = state.living.citizens.find(item => item.id === id);
      found = citizen ? at(citizen.districtId) : district(id);
    } else if (section === 'services' || section === 'transport') found = service(id);
    else if (section === 'council' || section === 'housing' || section === 'economy') found = motion(id) ?? district(id);
    else if (section === 'promises') {
      const promise = state.living.promises.find(item => item.id === id);
      if (promise) {
        found = promise.kind === 'project' ? project(promise.targetId)
          : promise.kind === 'asset' ? asset(promise.targetId)
          : promise.kind === 'service' ? service(promise.targetId)
          : promise.kind === 'housing' ? motion(promise.targetId)
          : undefined;
        found ??= at(promise.districtId);
      }
    }
  }
  return found ?? at(selection.districtId);
}
