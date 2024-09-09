const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg";
export const routes_url = `${protocol}${sofiatraffic_url}/bg/trip/getLines`;
export const schedule_url = `${protocol}${sofiatraffic_url}/bg/trip/getSchedule`;

export const old_stops_url = `${protocol}routes.${sofiatraffic_url}/`;
export const stops_url = `${protocol}${sofiatraffic_url}/bg/trip/getAllStops`;

export const main_types = ['metro', 'tram', 'trolley', 'bus'];