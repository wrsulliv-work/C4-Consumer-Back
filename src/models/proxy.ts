export interface EventLink {
  eventID: string;
  eventTime: string;
  eventType: string;
  data: EventData;
  linked?: EventLink[];
}

export interface GTINToEPCMap {
  gtin: string;
  epcList: string[];
}

export interface BizTransaction {
  bizTransaction: string;
  type: string;
}

export interface ChildQuantity {
  epcClass: string;
  quantity: number;
  quantity_uom: string;
}

export interface Destination {
  destination: string;
  type: string;
}

export interface Source {
  source: string;
  type: string;
}

export interface EventData {
  eventID: string;
  bizLocationGLN: string;
  flatGTINToEPCMap: GTINToEPCMap[];
  parentID: string;
  flatGTINList: string[];
  bizStep: string;
  readPoint: string;
  bizTransactionList: BizTransaction[];
  generationInfo: {
    isConnectorGenerated: boolean;
  };
  eventTime: string;
  childQuantityList: ChildQuantity[];
  action: string;
  childTraceEPCs: string[];
  bizLocation: string;
  eventTimeZoneOffset: string;
  childGTINs: string[];
  destinationList: Destination[];
  sourceList: Source[];
  readPointGLN: string;
  flatEPCList: string[];
  flatTraceEPCList: string[];
  sourceListGLN: Source[];
  disposition: string;
  recordTime: string;
  destinationListGLN: Destination[];
}

export interface Event {
  data: EventData;
  eventType: string;
  BlockchainTXID?: string;
  BlockchainTxTimestamp?: string;
}

export interface Payload {
  payloadID: string;
  locationList: string[];
  payload: string | any;
  payloadTime: string;
  payloadContentType: string;
  locationGLNList: string[];
  epcList: string[];
  payloadTypeURI: string[];
  eventIDList: string[];
}

export interface Facility {
  locationGLN__t: string;
  registeringParty: string;
  documentHeader: {
    documentType: string;
    receiverGLN: string;
    documentID: string;
    senderGLN: string;
    creationDateTime: string;
  },
  partyRole: {
    partyRoleCode: string;
    partyRoleCode__t: string;
    partyName__t: string;
    partyName: string;
  },
  partyAddress: {
    state__t: string;
    languagePartyCode: string;
    poBoxNumber: string;
    streetAddress__t: string;
    city: string;
    streetAddress: string;
    countryCode: number;
    postalCode: number;
    name: string;
    city__t: string;
    state: string;
    name__t: string;
  },
  isPartyActive: boolean;
  locationGLN: string;
}

export interface ObjectMaster {
  dataRecipientGLN: string;
  documentHeader: {
    documentType: string;
    receiverGLN: string;
    documentID: string;
    senderGLN: string;
    creationDateTime: string;
  },
  objectSKU: string;
  objectID__t: string;
  dataSourceGLN: string;
  objectID: string;
  objectDescription: string;
  objectDescription__t: string;
}

export interface DataWrapper<T> {
  data: T;
}

export interface PayloadList {
  data: {
    assets: DataWrapper<Payload>[];
  };
}

export interface FacilityList {
  data: {
    assets: DataWrapper<Facility>[];
  };
}

export interface ObjectMasterList {
  data: {
    assets: DataWrapper<ObjectMaster>[];
  }
}