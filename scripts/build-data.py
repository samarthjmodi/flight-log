"""Regenerate public flight data, excluding booking references and prices."""
import json, re
from pathlib import Path
root = Path(__file__).resolve().parent.parent
flights=[]
for line in (root/'flight-history.md').read_text().splitlines():
    p=[s.strip() for s in line.split('|')[1:-1]]
    if len(p)!=12 or not p[0].isdigit(): continue
    origin,destination=p[4].split(' -> ')
    duration=re.fullmatch(r'(\d+)h (\d+)m',p[6])
    airline={'Alaska':'Alaska Airlines'}.get(p[2],p[2])
    flights.append(dict(id=int(p[0]),date=p[1],airline=airline,flight=p[3],origin=origin,destination=destination,miles=int(p[5]),minutes=int(duration[1])*60+int(duration[2]) if duration else None))
(root/'assets/flights.json').write_text(json.dumps(flights,indent=2)+'\n')
print(f'Exported {len(flights)} flights')
