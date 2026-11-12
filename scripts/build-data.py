"""Regenerate public flight data without booking references or passenger details."""
import json, re
from decimal import Decimal
from pathlib import Path
root = Path(__file__).resolve().parent.parent
flights=[]
booking=None
source=(root/'flight-history.md').read_text()
# Only the completed-flight table is authoritative; later sections repeat rows.
table=source.split('## All flights',1)[1].split('## Cost by booking',1)[0]
for line in table.splitlines():
    p=[s.strip() for s in line.split('|')[1:-1]]
    if len(p)!=12 or not p[0].isdigit(): continue
    origin,destination=p[4].split(' -> ')
    duration=re.fullmatch(r'(\d+)h (\d+)m',p[6])
    airline={'Alaska':'Alaska Airlines'}.get(p[2],p[2])
    price=None
    if p[10].startswith('Yes'):
        currency='USD' if p[7].startswith('$') else 'INR'
        amount=re.search(r'[0-9][0-9,]*(?:\.[0-9]+)?', p[7] if currency=='USD' else p[8]).group()
        booking=dict(firstFlightId=int(p[0]),amountCents=int(Decimal(amount.replace(',',''))*100),currency=currency,type=p[9])
        price=booking.copy()
    elif p[10].startswith('No - included'):
        assert booking is not None
        price=booking.copy()
    flights.append(dict(id=int(p[0]),date=p[1],airline=airline,flight=p[3],origin=origin,destination=destination,miles=int(p[5]),minutes=int(duration[1])*60+int(duration[2]) if duration else None,price=price))
for flight in flights:
    price=flight['price']
    if price is None: continue
    legs=[f for f in flights if f['price'] and f['price']['firstFlightId']==price['firstFlightId']]
    index=next(i for i,f in enumerate(legs) if f['id']==flight['id'])
    share,remainder=divmod(price['amountCents'],len(legs))
    price['legAmountCents']=share+(index<remainder)
    price['legsInBooking']=len(legs)
# Preserve uncertainty supplied in the source instead of presenting estimates as exact.
for flight in flights:
    if flight['price']:
        flight['price']['approximate']='approx' in flight['price']['type'].lower()
    if flight['id']==1:
        flight['durationApproximate']=True
    if flight['origin']=='KOA' and flight['destination']=='HNL' or flight['origin']=='HNL' and flight['destination']=='SEA':
        flight['note']='Placeholder · Mar 7–8, 2026; exact date, airline and flight number unconfirmed'
    if flight['flight'] in ('AS642','AS617'):
        flight['note']='Itinerary assumed from a fellow traveler; ticket price confirmed by Samarth'
assert len({f['id'] for f in flights})==len(flights), 'Duplicate flight IDs'
(root/'assets/flights.json').write_text(json.dumps(flights,indent=2)+'\n')
print(f'Exported {len(flights)} flights')
