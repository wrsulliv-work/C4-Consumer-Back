import * as rp from 'request-promise';
import { ResultSet, NestedEvent, NestedFacility } from '../models/api';
import { Event, EventLink, PayloadList, FacilityList, Payload, ObjectMasterList, ObjectMaster, Facility } from '../models/proxy';
import { DataModelUi, UIEvent, GrowEvent, IncubationEvent, SacrificeEvent, FeedingEvent, DeliveryEvent } from '../models/ui';

interface CustomField {
  type: string;
  key: string;
  value: string;
}

enum EventDirection {
  Incoming = 'incoming',
  Outgoing = 'outgoing'
}

//  Use with `Array.sort` to obtain a sorted list of events in ascending order of eventTime
const eventComparator = (a: Event, b: Event) => {
  return (new Date(a.data.eventTime).getTime() - new Date(b.data.eventTime).getTime());
};

export class ProvenanceService {

  //  TODO:  Cache in a global ResultSet.

  constructor(private baseUrl: string) {}

  /*
   * Public Methods
   */

  //  Retrieve the payload associated with the C4 Consumer Trace Application
  private getConsumerAppCustomFields(payloadList: Payload[] = []): CustomField[] {
    for (const payload of payloadList) {
      const customFieldList: CustomField[] = payload.payload;
      if (customFieldList.length) {
        const titleField = customFieldList[0];
        if ((titleField.type === "string") && (titleField.value === 'C4 Consumer App Data')) {
          return customFieldList.slice(1);
        }
      }
    }
    return [];
  }

  private getEventsBySourceGLN(gln: string, resultSet: ResultSet) {
    const eventList: Event[] = [];
    //  Iterate the Events
    Object.keys(resultSet.eventMap).forEach(eventId => {
      const event = resultSet.eventMap[eventId];
      //  Search the GLNs
      const glnList = event.data.sourceListGLN.map(source => source.source);
      if (glnList.indexOf(gln) > -1) { eventList.push(event); }
    });
    return eventList.sort(eventComparator);
  }

  /**
   * Returns a list of events associated with a given GLN.
   * @param gln
   * @param resultSet 
   * @param eventDirection 
   * @param internal 
   */
  private getEventsByGLN(gln: string, resultSet: ResultSet, eventDirection: EventDirection, includeInternal: boolean) {
    const eventList: Event[] = [];
    //  Iterate the Events
    Object.keys(resultSet.eventMap).forEach(eventId => {

      //  Get the Source and Destination GLN Lists
      const event = resultSet.eventMap[eventId];
      const destGLNList = event.data.destinationListGLN.map(dest => dest.destination);
      const srcGLNList = event.data.sourceList.map(src => src.source);

      //  Search the GLNs
      let searchMatch = false;
      if (eventDirection === EventDirection.Incoming) {
        //  Check the "destination" list for incoming events
        searchMatch = (destGLNList.indexOf(gln) > -1);
      } else {
        //  Check the "source" list for outgoing events
        searchMatch = (srcGLNList.indexOf(gln) > -1);
      }
      if (!searchMatch) return;

      //  Check if the event is an "interal" event to the same facility
      const externalDestGLNs = destGLNList.filter(destGLN => destGLN !== gln);
      const externalSrcGLNs = srcGLNList.filter(srcGLN => srcGLN !== gln);
      const isInternal = (!externalSrcGLNs.length && !externalDestGLNs.length);
      if (!includeInternal && isInternal) return;

      //  All conditions passed, push the event.
      eventList.push(event);

    });
    return eventList.sort(eventComparator);
  }

  private getEventByFacility(facility: Facility, resultSet: ResultSet): UIEvent[] {
    const partyRoleCode = facility.partyRole.partyRoleCode;
    const customFieldList = this.getConsumerAppCustomFields(resultSet.glnPayloadMap[facility.locationGLN]);

    const outgoingEventList = this.getEventsByGLN(facility.locationGLN, resultSet, EventDirection.Outgoing, false);
    const firstOutgoingEvent = outgoingEventList[0];
    const lastOutgoingEvent = outgoingEventList[outgoingEventList.length - 1];

    const incomingEventList = this.getEventsByGLN(facility.locationGLN, resultSet, EventDirection.Incoming, false);
    const firstIncomingEvent = incomingEventList[0];
    const lastIncomingEvent = incomingEventList[incomingEventList.length - 1];

    switch (partyRoleCode) {

      //  Farm
      case 'FARM': {
        //  Get the incubator facility
        const farmEPC = firstOutgoingEvent.data.flatEPCList[0];
        if (!farmEPC) throw new Error('The Farm must have at least one associated EPC.');
        const farmEPCPayload = resultSet.epcPayloadMap[farmEPC];
        const customFieldListEPC = this.getConsumerAppCustomFields(farmEPCPayload);
        const incubatorName = customFieldListEPC[0] ? customFieldListEPC[0].value : 'NA';
        const dateReceived = customFieldListEPC[1] ? customFieldListEPC[1].value : 'NA';
        return [
          <IncubationEvent> {
            eventType: 'incubation',
            dateBorn: dateReceived,
            dateIncubationEnd: dateReceived,
            eventName: 'Incubación',
            nameIncubation: incubatorName
          },
          <GrowEvent> {
            eventType: "grow",
            eventName: "Cria",
            growProcess: customFieldList[0] ? customFieldList[0].value : 'NA',
            growSystem: customFieldList[1] ? customFieldList[1].value : 'NA',
            originFarm: facility.partyAddress.name,
            city: facility.partyAddress.city
          },
          <FeedingEvent> {
            description: customFieldList[2] ? customFieldList[2].value : 'NA',
            eventType: "feeding",
            eventName: "Alimentación"
          }
        ];
      }
      case 'SLAUGHTERER': return [<SacrificeEvent>{
        city: facility.partyAddress.city,
        eventName: "Sacrificio",
        eventType: "sacrifice",
        sacrificeDate: lastOutgoingEvent.data.eventTime,
        slaughterhouse: facility.partyAddress.name
      }];
      default: return [{}];
    }
  }

  public async getDataModelUIFromEPC(token: string, epc: string): Promise<DataModelUi> {

    //  Get the ResultSet
    const resultSet = await this.getByEPC(token, epc);

    //  Get the Lot Payloads
    const customFieldList = this.getConsumerAppCustomFields(resultSet.epcPayloadMap[epc]);
    const deliveryAddress = customFieldList[0] ? customFieldList[0].value : 'NA';

    //  Get the UI Events associated with Facilities
    const eventList: UIEvent[] = [];
    Object.keys(resultSet.facilityMap).forEach(facilityName => {
      const facility = resultSet.facilityMap[facilityName];
      const uiEventList = this.getEventByFacility(facility, resultSet);
      eventList.push(...uiEventList);
    });

    //  Get the Retailer UIEvent associated with the Lot
    eventList.push(
      <DeliveryEvent> {
        deliveryAddress,
        eventName: "Plataforma de distribución",
        eventType: "delivery"
      }
    );
    
    //  Construct the DateModelUI
    return {
      detail: {
        description: 'Example Description',
        endDate: '', // ISO
        highTemp: 4, // Degrees C
        lowTemp: 4, // Degrees C
        providerImageList: [''], // URLs
        useMode: '' // eg "Consumir cocinado"
      },
      eventList
    };
  }

  /**
   * Generates a ResultSet by eventId using the Provenance Proxy.
   * Includes events, facilities, item master data, and payloads.
   * @param token
   * @param eventId
   */
  public async getByEventIdOld(token: string, event: Event): Promise<ResultSet> {

    //  Initialize the ResultSet
    const resultSet: ResultSet = { eventMap: {}, facilityMap: {}, epcPayloadMap: {}, glnPayloadMap: {}, objectMasterMap: {} };

    //  Get Event Data
    // const eventData = await this.getEventDetailByEventId(token, eventId);
    resultSet.eventMap[event.data.eventID] = event;

    //  Get Source Location Data
    for (const source of event.data.sourceListGLN) {
      const { source: gln } = source;

      //  Load the Facility
      const facility = await this.getFacility(token, gln);
      resultSet.facilityMap[facility.locationGLN] = facility;

      //  Load the Facility Payloads
      const payloadList = await this.getPayloadsForGLN(token, gln);
      const { glnPayloadMap } = resultSet;
      payloadList.forEach((payload) => {
        if (!glnPayloadMap[gln]) { glnPayloadMap[gln] = []; }
        glnPayloadMap[gln].push(payload);
      });
    }

    //  Get Destination Location Data
    for (const destination of (event).data.destinationListGLN) {
      const { destination: gln } = destination;

      //  Load the Facility
      const facility = await this.getFacility(token, gln);
      resultSet.facilityMap[facility.locationGLN] = facility;

      //  Load the Facility Payloads
      const payloadList = await this.getPayloadsForGLN(token, gln);
      const { glnPayloadMap } = resultSet;
      payloadList.forEach((payload) => {
        if (!glnPayloadMap[gln]) { glnPayloadMap[gln] = []; }
        glnPayloadMap[gln].push(payload);
      });
    }

    //  Get Payloads for EPC
    for (const epc of event.data.flatTraceEPCList) {
      const payloadList = await this.getPayloadsForEPC(token, epc);
      const { epcPayloadMap } = resultSet;
      payloadList.forEach((payload) => {
        if (!epcPayloadMap[epc]) { epcPayloadMap[epc] = []; }
        epcPayloadMap[epc].push(payload);
      });
    }

    //  Get Object Master Data
    for (const gtin of event.data.flatGTINList) {
      const objectMasterList = await this.getItemByGTIN(token, gtin);
      objectMasterList.forEach((objectMaster) => { resultSet.objectMasterMap[gtin] = objectMaster; });
    }

    return resultSet;
  }

  /**
   * Generates a ResultSet by EPC using the Provenance Proxy.
   * Includes events, facilities, item master data, and payloads.
   * @param token
   * @param epc
   */
  public async getByEPCOld(token: string, epc: string): Promise<ResultSet> {
    const resultSet: ResultSet = {
      epcPayloadMap: {}, eventMap: {}, facilityMap: {},
      glnPayloadMap: {}, objectMasterMap: {},
    };
    const events = await this.getMostRecentEventsByEPCClass(token, epc);
    for (const event of events) {
      const eventResultSet = await this.getByEventIdOld(token, event);
      this.mergeResultSets(eventResultSet, resultSet);
    }
    resultSet.queriedEpc = epc;
    return resultSet;
  }

  /**
   * Generates a ResultSet by EPC using the Provenance Proxy.
   * Includes events, facilities, item master data, and payloads.
   * @param token
   * @param traceEpc
   */
  public async getByEPC(token: string, traceEpc: string): Promise<ResultSet> {
    const resultSet: ResultSet = {
      epcPayloadMap: {}, eventMap: {}, facilityMap: {},
      glnPayloadMap: {}, objectMasterMap: {},
    };

    const eventList = await this.getMostRecentEventsByEPCClass(token, traceEpc);

    const glnMap = {};
    const gtinMap = {};
    const epcMap = {};

    eventList.forEach((event) => {
      event.data.destinationListGLN.forEach((gln) => { glnMap[gln.destination] = true; });
      event.data.sourceListGLN.forEach((gln) => { glnMap[gln.source] = true; });
      event.data.flatTraceEPCList.forEach((epc) => { epcMap[epc] = true; });
      event.data.flatGTINList.forEach((gtin) => { gtinMap[gtin] = true; });
      resultSet.eventMap[event.data.eventID] = event;
    });

    const glnList = Object.keys(glnMap);
    const gtinList = Object.keys(gtinMap);
    const epcList = Object.keys(epcMap);

    const facilityList = await this.getFacilities(token, glnList);
    const epcPayloadList = await this.getPayloadsForEPCs(token, epcList);
    const glnPayloadList = await this.getPayloadsForGLNs(token, glnList);
    const itemMasterList = await this.getItemsByGTINs(token, gtinList);

    facilityList.forEach((facility) => {
      resultSet.facilityMap[facility.locationGLN] = facility;
    });

    //  TODO:  Consider normalizing the payload structures in the final map.

    epcPayloadList.forEach((epcPayload) => {
      epcPayload.epcList.forEach((epc) => {
        if (!resultSet.epcPayloadMap[epc]) { resultSet.epcPayloadMap[epc] = []; }
        resultSet.epcPayloadMap[epc].push(epcPayload);
      });
    });

    glnPayloadList.forEach((glnPayload) => {
      glnPayload.locationGLNList.forEach((gln) => {
        if (!resultSet.glnPayloadMap[gln]) { resultSet.glnPayloadMap[gln] = []; }
        resultSet.glnPayloadMap[gln].push(glnPayload);
      });
    });

    itemMasterList.forEach((itemMaster) => {
      resultSet.objectMasterMap[itemMaster.objectID] = itemMaster;
    });

    resultSet.queriedEpc = traceEpc;
    return resultSet;
  }

  /**
   * Convert the ResultSet to a list of Events with linked data nested as children.
   * @param resultSet
   */
  public generateNestedEventList(resultSet: ResultSet): NestedEvent[] {

    //  Initialize the list of Nested Events
    const nestedEventList: NestedEvent[] = [];

    //  Iterate all Events
    Object.keys(resultSet.eventMap).forEach((eventId) => {
      const event = resultSet.eventMap[eventId];

      //  Get the Source Nested Facilities
      const sourceFacilityList: NestedFacility[] = event.data.sourceListGLN.map((source) => {
        const { source: gln } = source;
        const facility = resultSet.facilityMap[gln];
        const payloadList = resultSet.glnPayloadMap[gln] ? resultSet.glnPayloadMap[gln] : [];
        return { ...facility, payloadList };
      });

      //  Get the Destination Nested Facilities
      const destinationFacilityList: NestedFacility[] = event.data.destinationListGLN.map((destination) => {
        const { destination: gln } = destination;
        const facility = resultSet.facilityMap[gln];
        const payloadList = resultSet.glnPayloadMap[gln] ? resultSet.glnPayloadMap[gln] : [];
        return { ...facility, payloadList };
      });

      //  Get the EPC Payloads
      const epcPayloadMap = {};
      event.data.flatTraceEPCList.forEach((epc) => {
        epcPayloadMap[epc] = resultSet[epc];
      });

      //  Get the Object Master Data
      const objectMasterList = event.data.flatGTINList.map((gtin) => resultSet.objectMasterMap[gtin]);

      //  Add the Nested Event
      nestedEventList.push({ ...event, sourceFacilityList, destinationFacilityList, epcPayloadMap, objectMasterList });
    });
    return nestedEventList;
  }

  /*
   * Private Methods
   */

  private mergeResultSets(from: ResultSet, to: ResultSet): void {

    //  Copy Events
    Object.keys(from.eventMap).forEach((eventId) => {
      to.eventMap[eventId] = from.eventMap[eventId];
    });

    //  Copy Locations
    Object.keys(from.facilityMap).forEach((gln) => {
      to.facilityMap[gln] = from.facilityMap[gln];
    });

    //  Copy Object Masters
    Object.keys(from.objectMasterMap).forEach((objectId) => {
      to.objectMasterMap[objectId] = from.objectMasterMap[objectId];
    });

    //  Copy EPC Payloads
    Object.keys(from.epcPayloadMap).forEach((payloadId) => {
      to.epcPayloadMap[payloadId] = from.epcPayloadMap[payloadId];
    });

    //  Copy GLN Payloads
    Object.keys(from.glnPayloadMap).forEach((payloadId) => {
      to.glnPayloadMap[payloadId] = from.glnPayloadMap[payloadId];
    });
  }

  private renderAPIPayloadList(payload: PayloadList): Payload[] {
    const payloadList = payload.data.assets.map((payloadAsset) => ({
      ...payloadAsset.data,
      payload: JSON.parse(payloadAsset.data.payload),
    }));
    return payloadList;
  }

  /*
   *  Provenance Proxy Wrappers
   */
  private async getMostRecentEventsByEPCClass(token: string, epc: string): Promise<Event[]> {
    console.log('getMostRecentEventByEPCClass');
    const event: EventLink =
      await this.request(`${this.baseUrl}/CONSUMER/getMostRecentEventByEPCClass?epc=${epc}`, token);
    if (!event.eventID && !event.eventTime && !event.eventType && !event.linked && !event.data) { return []; }
    const parentEvent: Event = { eventType: event.eventType, data: event.data };
    const childEvents = event.linked ? event.linked.map((childEvent) => ({ eventType: childEvent.eventType, data: childEvent.data })) : [];
    return [parentEvent, ...childEvents];
  }

  /*
   *  Original Wrappers
   */

  private async getEventDetailByEventId(token: string, eventId: string): Promise<Event> {
    console.log('getEventDetailByEventId');
    return this.request(`${this.baseUrl}/CONSUMER/getEventDetailByEventId?eventID=${eventId}`, token);
  }

  private async getPayloadsForGLN(token: string, gln: string): Promise<Payload[]> {
    console.log('getPayloadForGLN');
    const res: PayloadList = await this.request(`${this.baseUrl}/CONSUMER/getPayloadForGLN?gln=${gln}`, token);
    return this.renderAPIPayloadList(res);
  }

  private async getPayloadsForEPC(token: string, epc: string): Promise<Payload[]> {
    console.log('getPayloadsForEPC');
    const res: PayloadList = await this.request(`${this.baseUrl}/CONSUMER/getPayloadForEPC?epc=${epc}`, token);
    return this.renderAPIPayloadList(res);
  }

  private async getFacility(token: string, gln: string): Promise<Facility> {
    console.log('getFacility');
    const res: FacilityList = await this.request(`${this.baseUrl}/CONSUMER/getFacility?gln=${gln}`, token);
    const facilityAssetList = (res.data.assets && res.data.assets.length) ? res.data.assets : [];
    if (facilityAssetList.length !== 1) { throw new Error('Only a single facilty should be returned per GLN.'); }
    return facilityAssetList[0].data;
  }

  private async getItemByGTIN(token: string, gtin: string): Promise<ObjectMaster[]> {
    console.log('getItemByGTIN');
    const res: ObjectMasterList = await this.request(`${this.baseUrl}/CONSUMER/getItemByGTIN?gtin=${gtin}`, token);
    const objectMasterList = res.data.assets.map((masterData) => masterData.data);
    return objectMasterList;
  }

  /*
   *  New Proxy Wrappers
   */
  private async getPayloadsForEPCs(token: string, epcList: string[]): Promise<Payload[]> {
    console.log('getPayloadsForEPCs');
    const res: PayloadList = await this.request(`${this.baseUrl}/CONSUMER/getPayloadsForEPCs?epcs=${epcList}`, token);
    return this.renderAPIPayloadList(res);
  }

  private async getPayloadsForGLNs(token: string, glnList: string[]): Promise<Payload[]> {
    console.log('getPayloadsForGLNs');
    const res: PayloadList = await this.request(`${this.baseUrl}/CONSUMER/getPayloadsForGLNs?glns=${glnList}`, token);
    return this.renderAPIPayloadList(res);
  }

  private async getFacilities(token: string, glnList: string[]): Promise<Facility[]> {
    console.log('getFacilities');
    const res: any = await this.request(`${this.baseUrl}/CONSUMER/getFacilities?glns=${glnList}`, token);
    const facilityAssetList = (res.data.assets && res.data.assets.length) ? res.data.assets : [];
    const facilityList = facilityAssetList.map((facilityAsset) => facilityAsset.data);
    return facilityList;
  }

  private async getItemsByGTINs(token: string, gtinList: string[]): Promise<ObjectMaster[]> {
    console.log('getItemsByGTINs');
    const res: any = await this.request(`${this.baseUrl}/CONSUMER/getItemsByGTINs?gtins=${gtinList}`, token);
    const objectMasterList = res.data.assets.map((masterData) => masterData.data);
    return objectMasterList;
  }

  private async request(uri: string, token: string): Promise<any> {

    //  Construct the Request Options
    const options = {
      uri,
      json: true,
      headers: {
        Authorization: token,
      }
    };

    //  Make the API Call
    return rp(options);
  }
}
