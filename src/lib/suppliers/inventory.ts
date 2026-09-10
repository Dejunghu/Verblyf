import type { HotelSummary } from './types';

/**
 * Demo-inventaris. Wordt gebruikt door de mock-adapter zodat de hele
 * applicatie werkt zonder API-sleutels — handig voor lokale ontwikkeling,
 * previews, tests en demo's aan hotels.
 */

export interface SeedHotel extends Omit<HotelSummary, 'id' | 'supplier' | 'supplierHotelId' | 'images'> {
  code: string;
  /** Basisprijs per nacht in centen (netto-inkoop). */
  baseRateCents: number;
  /** Illustratie-archetype voor de UI. */
  style: 'grachtenpand' | 'tower' | 'boutique' | 'kust' | 'paleis' | 'loft';
  palette: 'stone' | 'slate' | 'clay' | 'moss' | 'sandstone';
  neighbourhood: string;
  /** Wat dit hotel bespaart t.o.v. de grote OTA's, in procentpunten commissie. */
  commissionSaved: number;
}

export const SEED_HOTELS: SeedHotel[] = [
  { code: 'AMS-PLD', name: 'Pelicaen Grachtenhuis', city: 'Amsterdam', country: 'NL', neighbourhood: 'Jordaan', address: 'Prinsengracht 412', stars: 4, baseRateCents: 21500, style: 'grachtenpand', palette: 'stone', rating: { score: 9.1, count: 1284 }, amenities: ['Gratis wifi', 'Ontbijtbuffet', 'Fietsverhuur', 'Bar', 'Airco'], geo: { lat: 52.3676, lng: 4.8836 }, commissionSaved: 16, description: 'Zeventiende-eeuws grachtenpand met eiken vloeren, hoge ramen en uitzicht op het water.' },
  { code: 'AMS-ZUI', name: 'Zuidas Signature', city: 'Amsterdam', country: 'NL', neighbourhood: 'Zuidas', address: 'Gustav Mahlerlaan 88', stars: 5, baseRateCents: 32900, style: 'tower', palette: 'slate', rating: { score: 8.8, count: 942 }, amenities: ['Gratis wifi', 'Fitness', 'Spa', 'Restaurant', 'Parkeergarage', 'Airco'], geo: { lat: 52.3388, lng: 4.8729 }, commissionSaved: 18, description: 'Zakelijk designhotel op loopafstand van het financiële district, met skybar op de 21e etage.' },
  { code: 'AMS-DEP', name: 'De Pijp Loft Rooms', city: 'Amsterdam', country: 'NL', neighbourhood: 'De Pijp', address: 'Ferdinand Bolstraat 141', stars: 3, baseRateCents: 13400, style: 'loft', palette: 'clay', rating: { score: 8.5, count: 2103 }, amenities: ['Gratis wifi', 'Koffiebar', 'Fietsverhuur', 'Bagageopslag'], geo: { lat: 52.3547, lng: 4.8912 }, commissionSaved: 15, description: 'Betaalbaar en licht, midden in de levendigste buurt van de stad.' },
  { code: 'RTM-KOP', name: 'Kop van Zuid Waterfront', city: 'Rotterdam', country: 'NL', neighbourhood: 'Kop van Zuid', address: 'Wilhelminakade 210', stars: 4, baseRateCents: 17800, style: 'tower', palette: 'stone', rating: { score: 8.9, count: 1567 }, amenities: ['Gratis wifi', 'Restaurant', 'Fitness', 'Airco', 'Uitzicht op de Maas'], geo: { lat: 51.9053, lng: 4.4874 }, commissionSaved: 17, description: 'Ruime kamers met panoramisch zicht op de Erasmusbrug en de haven.' },
  { code: 'RTM-HOF', name: 'Hofbogen Studio Hotel', city: 'Rotterdam', country: 'NL', neighbourhood: 'Noord', address: 'Raadhuisstraat 12', stars: 3, baseRateCents: 11900, style: 'loft', palette: 'sandstone', rating: { score: 8.3, count: 736 }, amenities: ['Gratis wifi', 'Keukentje', 'Wasserette', 'Fietsverhuur'], geo: { lat: 51.9315, lng: 4.4699 }, commissionSaved: 15, description: 'Studios met eigen keukentje in een omgebouwd spoorviaduct.' },
  { code: 'UTC-DOM', name: 'Domplein Residentie', city: 'Utrecht', country: 'NL', neighbourhood: 'Binnenstad', address: 'Domplein 7', stars: 4, baseRateCents: 16200, style: 'paleis', palette: 'clay', rating: { score: 9.0, count: 884 }, amenities: ['Gratis wifi', 'Ontbijt', 'Bar', 'Vergaderruimte', 'Airco'], geo: { lat: 52.0907, lng: 5.1214 }, commissionSaved: 16, description: 'Aan de voet van de Domtoren, in een gerestaureerd kanunnikenhuis.' },
  { code: 'HAG-SCH', name: 'Scheveningen Duinzicht', city: 'Den Haag', country: 'NL', neighbourhood: 'Scheveningen', address: 'Gevers Deynootweg 990', stars: 4, baseRateCents: 18900, style: 'kust', palette: 'stone', rating: { score: 8.7, count: 1932 }, amenities: ['Gratis wifi', 'Zeezicht', 'Spa', 'Restaurant', 'Parkeren'], geo: { lat: 52.1099, lng: 4.2795 }, commissionSaved: 17, description: 'Direct aan het strand, met een zwembad dat uitkijkt over de Noordzee.' },
  { code: 'MST-VRI', name: 'Vrijthof Boutique', city: 'Maastricht', country: 'NL', neighbourhood: 'Centrum', address: 'Vrijthof 33', stars: 4, baseRateCents: 15600, style: 'boutique', palette: 'clay', rating: { score: 9.2, count: 611 }, amenities: ['Gratis wifi', 'Ontbijt', 'Wijnkelder', 'Binnentuin'], geo: { lat: 50.8492, lng: 5.6883 }, commissionSaved: 16, description: 'Twaalf kamers rond een binnentuin, met een wijnkelder uit 1748.' },
  { code: 'GRQ-GRO', name: 'Grote Markt Stadsherberg', city: 'Groningen', country: 'NL', neighbourhood: 'Binnenstad', address: 'Grote Markt 24', stars: 3, baseRateCents: 10800, style: 'grachtenpand', palette: 'moss', rating: { score: 8.4, count: 498 }, amenities: ['Gratis wifi', 'Café', 'Fietsverhuur'], geo: { lat: 53.2194, lng: 6.5665 }, commissionSaved: 14, description: 'Eenvoudig, warm en op de beste plek van de stad.' },
  { code: 'ANR-ZUI', name: 'Zuiderdokken Antwerpen', city: 'Antwerpen', country: 'BE', neighbourhood: 'Het Zuid', address: 'Vlaamsekaai 44', stars: 4, baseRateCents: 15200, style: 'boutique', palette: 'clay', rating: { score: 8.8, count: 1042 }, amenities: ['Gratis wifi', 'Ontbijt', 'Bar', 'Airco', 'Kunstcollectie'], geo: { lat: 51.2121, lng: 4.3901 }, commissionSaved: 16, description: 'Modernistisch pakhuis omgebouwd tot hotel, in de galeriewijk.' },
  { code: 'PAR-MAR', name: 'Marais Maison Verte', city: 'Parijs', country: 'FR', neighbourhood: 'Le Marais', address: '18 Rue de Turenne', stars: 4, baseRateCents: 24800, style: 'paleis', palette: 'moss', rating: { score: 9.0, count: 2214 }, amenities: ['Gratis wifi', 'Ontbijt', 'Binnentuin', 'Airco', 'Conciërge'], geo: { lat: 48.8566, lng: 2.3622 }, commissionSaved: 18, description: 'Een hôtel particulier uit de 18e eeuw met een verscholen tuin.' },
  { code: 'BER-MIT', name: 'Mitte Werkhaus', city: 'Berlijn', country: 'DE', neighbourhood: 'Mitte', address: 'Torstraße 122', stars: 4, baseRateCents: 14200, style: 'loft', palette: 'slate', rating: { score: 8.6, count: 1788 }, amenities: ['Gratis wifi', 'Koffiebar', 'Werkplekken', 'Fitness'], geo: { lat: 52.5296, lng: 13.4054 }, commissionSaved: 17, description: 'Industriële lofts met betonnen wanden en enorme ramen.' },
  { code: 'BCN-EIX', name: 'Eixample Casa Lluna', city: 'Barcelona', country: 'ES', neighbourhood: 'Eixample', address: 'Carrer de Mallorca 288', stars: 4, baseRateCents: 19600, style: 'boutique', palette: 'sandstone', rating: { score: 8.9, count: 3021 }, amenities: ['Gratis wifi', 'Dakterras', 'Zwembad', 'Airco', 'Ontbijt'], geo: { lat: 41.3959, lng: 2.1663 }, commissionSaved: 18, description: 'Modernistisch pand met een dakterras en klein zwembad boven de stad.' },
  { code: 'LIS-ALF', name: 'Alfama Miradouro', city: 'Lissabon', country: 'PT', neighbourhood: 'Alfama', address: 'Rua dos Remédios 61', stars: 3, baseRateCents: 12600, style: 'kust', palette: 'clay', rating: { score: 9.1, count: 1455 }, amenities: ['Gratis wifi', 'Dakterras', 'Ontbijt', 'Airco'], geo: { lat: 38.7118, lng: -9.1288 }, commissionSaved: 16, description: 'Steile straatjes, azulejos en een dakterras boven de Taag.' },
];

/** Kamertypes die elk hotel aanbiedt, met toeslag t.o.v. het basistarief. */
export const ROOM_TYPES = [
  { key: 'standard', name: 'Comfort tweepersoonskamer', bedType: 'Queensize', occupancy: 2, multiplier: 1.0, board: 'ROOM_ONLY' as const, refundable: true },
  { key: 'standard-bb', name: 'Comfort tweepersoonskamer', bedType: 'Queensize', occupancy: 2, multiplier: 1.14, board: 'BREAKFAST' as const, refundable: true },
  { key: 'saver', name: 'Comfort kamer — niet-restitueerbaar', bedType: 'Queensize', occupancy: 2, multiplier: 0.86, board: 'ROOM_ONLY' as const, refundable: false },
  { key: 'deluxe', name: 'Deluxe kamer met zitgedeelte', bedType: 'Kingsize', occupancy: 2, multiplier: 1.32, board: 'BREAKFAST' as const, refundable: true },
  { key: 'family', name: 'Familiekamer', bedType: '1 kingsize + 2 eenpersoons', occupancy: 4, multiplier: 1.58, board: 'BREAKFAST' as const, refundable: true },
  { key: 'suite', name: 'Junior suite', bedType: 'Kingsize', occupancy: 3, multiplier: 1.85, board: 'BREAKFAST' as const, refundable: true },
];
