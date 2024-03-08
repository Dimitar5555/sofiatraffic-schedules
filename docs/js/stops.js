const stops_div = document.querySelector('#stops_tab');
function init_stops(){
    var datalist_stops = stops_div.querySelector('datalist');
    var new_children = [];
    stops.forEach(stop => {
        new_children.push(html_comp('option', {text: `[${stop.code.toString().padStart(4, '0')}] ${stop.names[lang.code]}`, 'data-value': stop.code}));
    });
    datalist_stops.replaceChildren(...new_children);
}
