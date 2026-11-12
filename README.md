# Flight Log

Samarth Modi's flight history: an interactive world map, computed statistics, year filters, and a searchable journal. A static website with no build step or API keys.

## Preview

Run `python3 -m http.server 8000` and open http://localhost:8000. Serve over HTTP because map and flight data load using fetch.

## Data

`assets/flights.json` holds the 71 completed flights. Statistics update with both year and search filters. Airline names are normalized, distances come from the source log, and durations count only recorded minutes (two are missing). Upcoming and cancelled flights are excluded. The site does not expose booking references or passenger details.

Ticket prices reflect Samarth’s share. Multi-leg booking totals are divided equally into integer cents, with any remainder assigned to the earliest legs; these are estimates rather than airline-provided per-leg fares. USD and INR are kept separate. All 71 flights have prices, including a sponsored $0 fare. User-provided approximate prices are marked as approximate. Hawaii return details remain placeholders; the table preserves that uncertainty. Unknown prices remain null when present. The cost summary follows the active filters.

To regenerate from the private, untracked `flight-history.md`, run `python3 scripts/build-data.py`. The original file is deliberately ignored by Git. You may also edit the public JSON directly.

## Hosting

The included GitHub Actions workflow deploys the static site to GitHub Pages on pushes to `main`. Repository Settings → Pages should use **GitHub Actions** as its source. The expected project URL is https://samarthjmodi.github.io/flight-log/.

Map geometry and JavaScript libraries are bundled locally; Google Fonts is optional and system fallbacks are provided.

## Credits

- D3.js v7 (ISC): https://github.com/d3/d3
- topojson-client v3 (ISC): https://github.com/topojson/topojson-client
- world-atlas v2 (ISC), derived from public-domain Natural Earth geography: https://github.com/topojson/world-atlas

## Trip journal

Flights are grouped chronologically into journeys. A departure from Seattle starts a new trip, a return to Seattle ends it, and gaps longer than 60 days start a new group. One-way records stay as their own trips. Grouping uses the complete history before filters; partial groups show matching-leg counts and the full trip cost, explicitly labeled. The headline trip count follows the active filters. Trip date sorting changes group order while keeping legs in travel order.
