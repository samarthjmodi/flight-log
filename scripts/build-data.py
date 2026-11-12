"""Regenerate public flight data without booking references or passenger details."""
import json, re
from decimal import Decimal
from pathlib import Path
root = Path(__file__).resolve().parent.parent
flights=[]
booking=None
for line in (root/'flight-history.md').read_text().splitlines():
    p=[s.strip() for s in line.split('|')[1:-1]]
    if len(p)!=12 or not p[0].isdigit(): continue
    origin,destination=p[4].split(' -> ')
    duration=re.fullmatch(r'(\d+)h (\d+)m',p[6])
    airline={'Alaska':'Alaska Airlines'}.get(p[2],p[2])
    price=None
    if p[10]=='Yes':
        currency='USD' if p[7].startswith('$') else 'INR'
        amount=p[7][1:] if currency=='USD' else p[8].removeprefix('INR ')
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
(root/'assets/flights.json').write_text(json.dumps(flights,indent=2)+'\n')
print(f'Exported {len(flights)} flights')
