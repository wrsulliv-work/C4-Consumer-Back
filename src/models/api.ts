
import { Event, Payload, Facility, ObjectMaster } from './proxy';

export interface ResultSet {
  eventMap: { [eventId: string]: Event };
  glnPayloadMap: { [gln: string]: Payload[] };
  epcPayloadMap: { [epc: string]: Payload[] };
  facilityMap: { [gln: string]: Facility };
  objectMasterMap: { [gtin: string]: ObjectMaster };
  queriedEpc?: string;
}

export interface NestedFacility extends Facility {
  payloadList: Payload[];
}

export interface NestedEvent extends Event {
  sourceFacilityList: NestedFacility[];
  destinationFacilityList: NestedFacility[];
  objectMasterList: ObjectMaster[];
  epcPayloadMap: { [epc: string]: Payload[] };
}
