/*==============================================================================
  Imports
==============================================================================*/
import { Body, Controller, Get, Header, Patch, Path, Route, SuccessResponse, Tags } from "tsoa";
import { DataModelUi } from '../models/ui';
import { ProvenanceService } from '../services/provenance.service';
import { ConnectorService } from '../services/connector.service';
import { ItemResponse } from '../models/responses';

//  External Endoints
//  TODO:  Put in config
const proxyUrl = 'https://sandbox.food.ibm.com/ift/api/provenance-proxy';
const connUrl = 'https://fs-connector-integration.mybluemix.net'

//  Create Service Instances
const provService = new ProvenanceService(proxyUrl);
const connService = new ConnectorService(connUrl);

//  Cache
const epcCache = {};

// const myJson = '{ \"detail\": { \"description\": \"Pollo Campero calidad y origen Carrefour\", \"lowTemp\": \"0\", \"highTemp\": \"4\", \"endDate\": \"12\/10\/2018\", \"useMode\": \"Consumir cocinado\", \"providerImageList\": [\"..\/..\/assets\/img\/M3.jpg\"] }, \"eventList\": [{ \"eventType\": \"incubation\", \"eventName\": \"Incubaci\u00F3n\", \"nameIncubation\": \"INCUBADORA DEL SUR\", \"dateBorn\": \"15\/02\/2018\", \"dateIncubationEnd\": \"15\/02\/2018\", \"logoUrl\": \"assets\/img\/5.jpg\" }, { \"eventType\": \"grow\", \"eventName\": \"Cria\", \"farmDateEntry\" : \"15\/02\/2018\", \"farmDateOut\": \"22\/04\/2018\", \"originFarm\": \"GRANJA DEL NORTE MART\u00CDNEZ E HIJOS\", \"city\": \"ASTURIAS\", \"growSystem\": \"Pollo campero, edad minima de sacrificio 56 d\u00EDas, alimentaci\u00F3n y sistema de cr\u00EDa certificados por SGS conforme al Reglamento CE 543\/2008.\", \"growProcess\": \"\", \"urlVideo\": \"https:\/\/www.youtube.com\/embed\/d-6zdyhpeW0?rel=0\", \"logoUrl\": \"" }, { \"eventType\": \"feeding\", \"eventName\": \"Alimentaci\u00F3n\", \"description\": \"Alimentados con un 70% de cereales siendo el 50% maiz\", \"infoUrl\": \"http:\/\/www.axereal-elevage.com\/\", \"logoUrl\": \"assets\/img\/7.jpg\" }, { \"eventType\": \"sacrifice\", \"eventName\": \"Sacrificio\", \"sacrificeDate\": \"01\/06\/2018\", \"slaughterhouse\": \"Matadero Industrial de Aves L\u00F3pez\", \"city\": \"Alcal\u00E1 de Henares - Madrid\", \"infoUrl\": \"http:\/\/volailles-auvergne.com\/\", \"logoUrl\": \"assets\/img\/8.jpg\" }, { \"eventType\": \"delivery\", \"eventName\": \"Plataforma de distribuci\u00F3n\", \"deliveryAddress\": \"BARCELONA\", \"logoUrl\" : \"assets\/img\/9.jpg\" }] }';

/*==============================================================================
  Invoice Controller
==============================================================================*/
@Route("items")
@Tags("Items")
export class ItemsController extends Controller {
 
  @SuccessResponse(200)
  @Get("{Lote}/{Fecha}")
  public async getItem(@Path("Lote") lote: string, @Path("Fecha") fecha: string, @Header("Authorization") token: string): Promise<ItemResponse> {
    const res = await provService.getDataModelUIFromEPC(token, lote);
    return {
      Lote: `${lote}`,
      Fecha: `${fecha}`,
      JSON: res
    };
  }
}
