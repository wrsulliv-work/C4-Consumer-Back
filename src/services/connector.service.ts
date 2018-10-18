import * as rp from 'request-promise';
import { Payload } from '../models/proxy';

export class ConnectorService {

  constructor(private baseUrl: string) {}

  /*
   * Public Methods
   */

  /**
   * Upload a payload to the connector
   * @param token Onboarding Token
   * @param payload JSON Payload
   */
  //  TODO:  Support Entitlement
  public async uploadPayload(token: string, payload: Payload): Promise<any> {

    //  Generate the Payload XML
    const payloadXML = this.generatePayloadXML(payload);

    //  Construct the Request Options
    const options = {
      body: payloadXML,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/xml',
      },
      method: 'POST',
      uri: `${this.baseUrl}/fs/connector/v1/assets`,
    };

    //  Make the API Call
    console.log(`Uploading Payload: ${payload.payloadID}`);
    return rp(options);
  }

  private generatePayloadXML(payload: Payload) {

    //  NOTE:  `payloadTime` is updated.
    const payloadTime = (new Date()).toISOString();

    //  Construct the XML
    //  REFERENCE:  https://github.ibm.com/FoodSafety/developer-zone/wiki/xml_Payload
    const eventIdXML = (payload.eventIDList && payload.eventIDList.length) ? `
      <eventIDList>
        ${payload.eventIDList.map((eventId) => `<eventID>${eventId}</eventID>`).join('\n')}
      </eventIDList>` : '';

    const epcXML = (payload.epcList && payload.epcList.length) ? `
      <epcList>
        ${payload.epcList.map((epc) => `<epc>${epc}</epc>`).join('\n')}
      </epcList>` : '';

    const locationXML = (payload.locationList && payload.locationList.length) ? `
      <locationList>
        ${payload.locationList.map((loc) => `<location>${loc}</location>`).join('\n')}
      </locationList>` : '';

    const xml = `
      <ift:payload xmlns:ift="urn:ibm:ift:xsd:1">
        <!-- XML message to communicate generic string-encoded payloads to IBM Food Trust.-->
        <!-- NOTE : Comments for a field appear BELOW the field. -->
        <payloadMessage>
          <payloadID>${payload.payloadID}</payloadID>
          <!--Mandatory: ID of this payload.-->
          <payloadTime>${payloadTime}</payloadTime>
          <!--Optional: Timestamp for this payload message.-->
          <payloadContentType>${payload.payloadContentType}</payloadContentType>
          <!--Optional: http content type of payload e.g. https://en.wikipedia.org/wiki/Media_type -->
          <payloadTypeURI>${payload.payloadTypeURI}</payloadTypeURI>
          <!--Mandatory: URI for payload type.-->
          ${eventIdXML}
          <!--Optional: List of events with which this payload is associated.-->
          ${epcXML}
          <!--Optional: List of epcs with which this payload is associated.-->
          ${locationXML}
          <!--Optional: List of locations with which this payload is associated.-->
          <payload>${JSON.stringify(payload.payload)}</payload>
          <!--Mandatory: String-encoded payload.-->
        </payloadMessage>
        <!--Optional: Additional payloadMessage(s) can be added.-->
      </ift:payload>`;

    return xml;
  }
}
