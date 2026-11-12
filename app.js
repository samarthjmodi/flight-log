/* Public airport metadata: [city, longitude, latitude]. */
const airports = {
FRA:['Frankfurt',8.57,50.03],SAT:['San Antonio',-98.47,29.53],IAH:['Houston',-95.34,29.98],HNL:['Honolulu',-157.92,21.32],DEL:['Delhi',77.10,28.56],STV:['Surat',72.74,21.11],BOM:['Mumbai',72.87,19.09],SIN:['Singapore',103.99,1.36],SEA:['Seattle',-122.31,47.45],SFO:['San Francisco',-122.38,37.62],BOS:['Boston',-71.01,42.36],PHL:['Philadelphia',-75.24,39.87],DXB:['Dubai',55.36,25.25],LAS:['Las Vegas',-115.15,36.08],DEN:['Denver',-104.67,39.86],AUS:['Austin',-97.67,30.20],MSY:['New Orleans',-90.26,29.99],CUN:['Cancún',-86.88,21.04],ORD:['Chicago',-87.90,41.98],AMD:['Ahmedabad',72.63,23.08],IAD:['Washington, DC',-77.46,38.95],LAX:['Los Angeles',-118.41,33.94],PPT:['Tahiti',-149.61,-17.55],JFK:['New York',-73.78,40.64],PAE:['Everett',-122.28,47.91],HND:['Tokyo',139.78,35.55],OGG:['Maui',-156.43,20.90],KOA:['Kona',-156.05,19.74],MUC:['Munich',11.79,48.35],SPU:['Split',16.30,43.54],DBV:['Dubrovnik',18.27,42.56],BEG:['Belgrade',20.31,44.82],ATH:['Athens',23.94,37.94],JTR:['Santorini',25.48,36.40],SJC:['San José',-121.93,37.36],MIA:['Miami',-80.29,25.79],CTG:['Cartagena',-75.51,10.44]
};
let flights=[], year='all', query='', descending=true, world, mapLayer, projection, path, zoom;
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const dateText=s=>new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const duration=n=>n==null?'Not recorded':`${Math.floor(n/60)}h ${String(n%60).padStart(2,'0')}m`;
const city=code=>airports[code][0];
const money=(cents,currency)=>new Intl.NumberFormat('en-US',{style:'currency',currency,currencyDisplay:currency==='INR'?'code':'symbol'}).format(cents/100);
function flightPrice(f){
 if(!f.price)return '<span class="price-unknown">Not recorded</span>';
 const p=f.price;
 const label=p.type.startsWith('Sponsored')?'Sponsored · no cost':p.approximate?(p.legsInBooking>1?`Approximate · 1/${p.legsInBooking} of booking`:'Approximate · user provided'):p.legsInBooking>1?`Estimated · 1/${p.legsInBooking} of booking`:p.type==='Allocated'?'Allocated passenger share':'Confirmed';
 return `${p.approximate?'≈ ':''}${money(p.legAmountCents,p.currency)}<small>${label}</small>`;
}
function selected(){return flights.filter(f=>(year==='all'||f.date.startsWith(year))&&(!query||[f.airline,f.flight,f.origin,f.destination,city(f.origin),city(f.destination),f.date].join(' ').toLowerCase().includes(query)));}
function rank(values){const counts=new Map();values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));}
// Group the complete history before applying filters so trips retain their identity.
function groupTrips(history){
 const trips=[];
 let current=null;
 for(const flight of [...history].sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id)){
  const previous=current?.legs.at(-1);
  const gap=previous?(new Date(flight.date)-new Date(previous.date))/86400000:0;
  if(!current||flight.origin==='SEA'||gap>60){
   current={id:flight.id,legs:[]};trips.push(current);
  }
  current.legs.push(flight);
  if(flight.destination==='SEA')current=null;
 }
 return trips;
}
function tripRoute(legs){
 let route=legs[0].origin;
 let previous=legs[0].origin;
 for(const leg of legs){
  if(previous!==leg.origin)route+=` ··· ${leg.origin}`;
  route+=` → ${leg.destination}`;
  previous=leg.destination;
 }
 return route;
}
function renderJournal(data){
 const selectedIds=new Set(data.map(f=>f.id));
 const trips=groupTrips(flights).map(trip=>({...trip,visible:trip.legs.filter(f=>selectedIds.has(f.id))})).filter(trip=>trip.visible.length);
 if(descending)trips.reverse();
 $('flight-count').textContent=`${trips.length} trips · ${data.length} flights`;
 const rows=[];
 for(const trip of trips){
  const first=trip.legs[0],last=trip.legs.at(-1),partial=trip.visible.length!==trip.legs.length;
  const amounts=['USD','INR'].map(currency=>{
   const priced=trip.visible.filter(f=>f.price?.currency===currency);
   return priced.length?`${priced.some(f=>f.price.approximate)?'≈ ':''}${money(priced.reduce((sum,f)=>sum+f.price.legAmountCents,0),currency)}`:null;
  }).filter(Boolean);
  const heading=document.createElement('tr');heading.className='trip-heading';
  const dates=first.date===last.date?dateText(first.date):`${dateText(first.date)} – ${dateText(last.date)}`;
  heading.innerHTML=`<th colspan="6" scope="rowgroup"><div class="trip-summary"><div><span class="trip-dates">${dates}</span><strong>${tripRoute(trip.legs)}</strong><span class="trip-count">${partial?`${trip.visible.length} of ${trip.legs.length} flights match filters`:`${trip.legs.length} flight${trip.legs.length===1?'':'s'}`} · ${number(trip.visible.reduce((sum,f)=>sum+f.miles,0))} mi${partial?' shown':''}</span></div><div class="trip-price">${amounts.join(' + ')||'Price not recorded'}<small>${partial?'Matching flights':'Trip ticket total'}</small></div></div></th>`;
  rows.push(heading);
  for(const f of trip.visible){
   const tr=document.createElement('tr');tr.className='flight-row';
   tr.innerHTML=`<td>${dateText(f.date)}${f.note?`<small class="flight-note">${f.note}</small>`:''}</td><td class="route-cell" title="${city(f.origin)} to ${city(f.destination)}">${f.origin}<span>→</span>${f.destination}</td><td class="price-cell">${flightPrice(f)}</td><td class="airline-cell">${f.airline}<small>${f.flight==='Unknown'?'Flight number not recorded':f.flight}</small></td><td>${number(f.miles)} mi</td><td>${f.durationApproximate?'≈ ':''}${duration(f.minutes)}</td>`;
   rows.push(tr);
  }
 }
 $('flight-rows').replaceChildren(...rows);
}
function render(){
 const data=selected(), codes=new Set(data.flatMap(f=>[f.origin,f.destination]));
 const miles=data.reduce((s,f)=>s+f.miles,0), minutes=data.reduce((s,f)=>s+(f.minutes||0),0), missing=data.filter(f=>f.minutes==null).length;
 $('stats').innerHTML=[['TOTAL FLIGHTS',number(data.length),'Every takeoff, counted'],['AIRPORTS',number(codes.size),'Places along the way'],['MILES FLOWN',number(miles),`${(miles/24901).toFixed(1)}× around the Earth`],['HOURS IN FLIGHT',`${Math.floor(minutes/60)}<small>h</small> ${minutes%60}<small>m</small>`,missing?`${missing} flight duration${missing===1?'':'s'} not recorded`:'All durations recorded']].map(([label,value,note])=>`<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-note">${note}</span></div>`).join('');
 $('selection-note').textContent=`${year==='all'?'All years':year} · ${data.length} completed flight${data.length===1?'':'s'}`;
 document.querySelectorAll('.years button').forEach(b=>{b.classList.toggle('active',b.dataset.year===year);b.setAttribute('aria-pressed',String(b.dataset.year===year));});
 const airlines=rank(data.map(f=>f.airline)), visits=rank(data.flatMap(f=>[f.origin,f.destination]));
 $('top-airline').textContent=airlines[0]?.[0]||'No flights';
 $('airline-note').textContent=airlines.length?`${airlines[0][1]} flight${airlines[0][1]===1?'':'s'} · ${Math.round(airlines[0][1]/data.length*100)}% of your journeys`: 'Try another filter';
 $('airlines').innerHTML=airlines.slice(0,3).map(([name,count])=>`<div class="bar-row"><span>${name.replace(' Airlines','')}</span><div class="bar-track"><span style="width:${count/airlines[0][1]*100}%"></span></div><b>${count}</b></div>`).join('');
 const longest=[...data].sort((a,b)=>b.miles-a.miles)[0];
 $('longest-route').textContent=longest?`${longest.origin} → ${longest.destination}`:'—';
 $('longest-note').textContent=longest?`${number(longest.miles)} miles · ${city(longest.origin)} to ${city(longest.destination)}`:'No matching flights';
 $('top-airport').textContent=visits.length?city(visits[0][0]):'—';
 $('airport-note').textContent=visits.length?`${visits[0][1]} arrivals and departures`:'No matching flights';
 $('home-code').textContent=visits[0]?.[0]||'—';
 $('flight-count').textContent=`(${data.length})`;
 const totals=['USD','INR'].map(currency=>{
 const priced=data.filter(f=>f.price?.currency===currency);
 return priced.length?money(priced.reduce((sum,f)=>sum+f.price.legAmountCents,0),currency):null;
 }).filter(Boolean);
 const approximate=data.some(f=>f.price?.approximate);
 $('data-note').textContent=`Prices reflect Samarth’s share, with multi-leg booking totals split equally across legs (estimated). Any extra cent is assigned to the earliest legs. USD and INR are kept separate. Approximate source prices are marked ≈; sponsored flights cost $0. Ticket prices exclude extras. Completed flights only. Distances are great-circle estimates. Duration totals include available times${missing?`; ${missing} flight duration${missing===1?' is':'s are'} unknown`:''}.`;
 $('price-summary').textContent=`Ticket cost for selected flights: ${approximate?'≈ ':''}${totals.join(' + ')||'Not recorded'} · ${data.filter(f=>f.price).length} of ${data.length} flights priced`;
 $('empty').hidden=data.length>0;
 renderJournal(data);
 $('map-detail').textContent=data.length?'Select a route or airport to explore':'No matching flights';
 renderMap(data,codes);
}
function renderMap(data,codes){
 if(!mapLayer)return;
 mapLayer.selectAll('.routes,.airports,.labels').remove();
 const groups=new Map();
 data.forEach(f=>{const key=[f.origin,f.destination].sort().join('-');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);});
 const routes=mapLayer.append('g').attr('class','routes');
 routes.selectAll('path').data([...groups.values()]).join('path').attr('class','route').attr('d',group=>path({type:'LineString',coordinates:[airports[group[0].origin].slice(1),airports[group[0].destination].slice(1)]})).on('click',function(event,group){
 event.stopPropagation();mapLayer.selectAll('.route').classed('selected',false);d3.select(this).classed('selected',true);
 $('map-detail').textContent=`${city(group[0].origin)} ↔ ${city(group[0].destination)} · ${group.length} flight${group.length===1?'':'s'} · ${number(group[0].miles)} mi each`;
 }).append('title').text(g=>`${g[0].origin} ↔ ${g[0].destination} · ${g.length} flights`);
 mapLayer.append('g').attr('class','airports').selectAll('circle').data([...codes]).join('circle').attr('class','airport').attr('cx',c=>projection(airports[c].slice(1))[0]).attr('cy',c=>projection(airports[c].slice(1))[1]).attr('r',3).on('click',(event,c)=>{
 event.stopPropagation();const related=data.filter(f=>f.origin===c||f.destination===c);$('map-detail').textContent=`${city(c)} (${c}) · ${related.length} arrivals and departures`;
 mapLayer.selectAll('.route').classed('selected',g=>g.some(f=>f.origin===c||f.destination===c));
 }).append('title').text(c=>`${city(c)} (${c})`);
 // Keep labels legible by avoiding overlapping text boxes.
 const occupied=[];const labels=rank(data.flatMap(f=>[f.origin,f.destination])).map(v=>v[0]).filter(c=>{
 const [x,y]=projection(airports[c].slice(1));if(occupied.some(([a,b])=>Math.abs(a-x)<32&&Math.abs(b-y)<13))return false;occupied.push([x,y]);return true;
 });
 mapLayer.append('g').attr('class','labels').selectAll('text').data(labels).join('text').attr('class','airport-label').attr('x',c=>projection(airports[c].slice(1))[0]+5).attr('y',c=>projection(airports[c].slice(1))[1]-5).text(c=>c);
}
async function init(){
 try {
 [flights,world]=await Promise.all([fetch('assets/flights.json?v=history-71').then(r=>{if(!r.ok)throw Error('Flight data unavailable');return r.json();}),fetch('assets/world.json').then(r=>{if(!r.ok)throw Error('Map data unavailable');return r.json();})]);
 const years=[...new Set(flights.map(f=>f.date.slice(0,4)))].sort();
 for(const y of ['all',...years]){const b=document.createElement('button');b.textContent=y==='all'?'All time':y;b.dataset.year=y;b.onclick=()=>{year=y;render();};$('years').append(b);}
 const svg=d3.select('#map');
 projection=d3.geoNaturalEarth1().rotate([110,0]).fitExtent([[28,15],[1072,520]],{type:'Sphere'});
 path=d3.geoPath(projection);mapLayer=svg.append('g');
 mapLayer.append('path').datum(d3.geoGraticule10()).attr('class','graticule').attr('d',path);
 mapLayer.append('g').selectAll('path').data(topojson.feature(world,world.objects.countries).features).join('path').attr('class','land').attr('d',path);
 zoom=d3.zoom().scaleExtent([1,7]).translateExtent([[-200,-120],[1300,680]]).on('zoom',e=>mapLayer.attr('transform',e.transform));svg.call(zoom);
 $('reset-map').onclick=()=>{svg.transition().duration(350).call(zoom.transform,d3.zoomIdentity);mapLayer.selectAll('.route').classed('selected',false);$('map-detail').textContent='Select a route or airport to explore';};
 $('search').addEventListener('input',e=>{query=e.target.value.trim().toLowerCase();render();});
 $('sort-date').onclick=()=>{descending=!descending;$('sort-date').textContent=`Trip date ${descending?'↓':'↑'}`;render();};
 render();
 }catch(error){$('stats').textContent='Unable to load flight data. Please refresh the page.';console.error(error);}
}
init();
