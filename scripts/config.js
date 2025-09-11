const protocol = "https://";
const sofiatraffic_url = "sofiatraffic.bg";
export const routes_url = `${protocol}${sofiatraffic_url}/bg/trip/getLines`;
export const schedule_url = `${protocol}${sofiatraffic_url}/bg/trip/getSchedule`;

export const old_stops_url = `${protocol}routes.${sofiatraffic_url}/`;
export const stops_url = `${protocol}${sofiatraffic_url}/bg/trip/getAllStops`;

export const main_types = ['metro', 'tram', 'trolley', 'bus'];

export const osm_network_name = "Градски транспорт София";
export const osm_stops_types = [
    {type: 'subway', public_transport: 'stop_position'},
    {type: 'tram', public_transport: 'stop_position'},
    {type: 'bus', public_transport: 'platform'},
    {type: 'trolleybus', public_transport: 'platform'},
]