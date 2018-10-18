export interface DataModelUi {
  detail: {
    description: string;
    endDate: string; // ISO
    highTemp: number; // Degrees C
    lowTemp: number; // Degrees C
    providerImageList: string[]; // URLs
    useMode: string; // eg "Consumir cocinado"
  };
  eventList: UIEvent[];
}

export interface UIEvent {}

export interface IncubationEvent extends UIEvent {
  eventType: "incubation";
  dateBorn: string; // ISO.  From 
  dateIncubationEnd: string; // ISO
  eventName: "Incubación"; // TODO is this dynamic?
  logoUrl: string;
  nameIncubation: string;
}

export interface GrowEvent extends UIEvent {
  eventType: "grow";
  eventName: "Cria"; // TODO is this dynamic?
  growProcess: string; // Paragraph of text
  growSystem: string; // Paragraph
  logoUrl: string;
  originFarm: string; // Name
  urlVideo: string;
  city: string;
}

export interface FeedingEvent extends UIEvent {
  farmEntryDate: string;
  farmDepartureDate: string;
  description: string;
  eventType: "feeding";
  eventName: "Alimentación";
  infoUrl: string;
  logoUrl: string;
}

export interface SacrificeEvent extends UIEvent {
  city: string;
  eventName: "Sacrificio";
  eventType: "sacrifice";
  infoUrl: string;
  logoUrl: string;
  sacrificeDate: string; // ISO
  slaughterhouse: string; // Name of the slaughterhouse
}

export interface DeliveryEvent extends UIEvent {
  deliveryAddress: string;
  eventName: "Plataforma de distribución";
  eventType: "delivery";
  logoUrl: string;
}
