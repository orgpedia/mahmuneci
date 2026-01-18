# Requirements: Municipal Ward Election Map

## Goal
Build a single-page site that shows a city ward map and colors each ward by the winning party. The site defaults to Mumbai and supports switching city and language (English/Marathi).

## Data Sources
- GeoJSON (as JS globals):
  - `mumbai.js.txt`
  - `pune.js.txt`
  - `pcmc.js.txt`
- Election results (CSV):
  - `mumbai.csv`
  - `pune.csv`
  - `pcmc.csv`
- Party colors (new JSON file; editable by user).
- UI strings (new JSON file; English + Marathi).
- Brand assets (local images):
  - `orgpedia_label.png`
  - `orgpedia_label_footer.png`
  - `orgpedia_logo.jpeg`

## City Mapping
- Mumbai:
  - Title: "Brihanmumbai Municipal Corporation Election Results"
  - Map file: `mumbai.js.txt`
  - CSV file: `mumbai.csv`
- Pune:
  - Title: "Pune Municipal Corporation Election Results"
  - Map file: `pune.js.txt`
  - CSV file: `pune.csv`
- PCMC:
  - Title: "Pimpri Chinchwad Muncipal Corporation Election Results"
  - Map file: `pcmc.js.txt`
  - CSV file: `pcmc.csv`

## CSV Schema and Localization
Base columns (English):
- `Area`, `Ward No`, `Sub Ward`, `Ward Name`, `Winner`, `Party`

Marathi columns:
- Same names with `_mr` appended (e.g., `Ward Name_mr`, `Winner_mr`, `Party_mr`, `Area_mr`, `Ward No_mr`).

Rules:
- Join key is always `Ward No` (English), matched against GeoJSON `ward_no`.
- Marathi mode uses `_mr` columns for display, but joins still use English `Ward No`.
- Only render fields that are present and non-empty (e.g., `Area` exists for Mumbai but is blank for Pune/PCMC).

## Party Color Rules
- Colors must be consistent across all cities and languages.
- Party colors should live in a separate JSON file so they are easily editable.
- The color lookup must work for both English and Marathi party names.
  - Use the English `Party` column as the canonical key for color lookup.
  - Use `Party_mr` only for display in Marathi mode.

## Ward Aggregation Rules
- Mumbai: one CSV row per ward.
  - Ward color = party in that row.
  - Legend counts = number of wards won per party.
- Pune/PCMC: multiple sub-ward rows per ward.
  - Ward color = majority party by sub-ward seat count.
  - Tie-breaking: if counts are tied, use the party of sub-ward "A".
  - Legend counts = number of sub-ward seats won per party (not ward count).

## UI Layout
- Header/hero area with:
  - Eyebrow label (localized).
  - H1 title (city-specific, includes "Election Results").
  - Subhead (localized).
  - Stat blocks (localized labels).
- Controls:
  - City dropdown (Mumbai, Pune, PCMC).
  - Language dropdown (English, Marathi).
- Main layout:
  - Map card on left (Leaflet).
  - Right panel with legend and ward details.
- Footer with data sources (localized string).

## Branding and Visual Style
- Follow the color scheme and visual language of https://www.orgpedia.in/, using the palette and typography from `/Users/mukund/orgpedia/site.cabsec/docs/c/output.css`.
- Use the provided Orgpedia logo assets:
  - Header/hero should include `orgpedia_label.png`.
  - Footer should include `orgpedia_label_footer.png`.
  - Use `orgpedia_logo.jpeg` for favicon or a subtle map watermark if needed.
- Brand palette baseline (from Orgpedia site styles; keep editable):
  - Primary blue: `#3B82F6`.
  - Ink/primary text: `#000000`.
  - Body text: `#333333`, muted text: `#666666` and `#999999`.
  - Backgrounds: `#FFFFFF`, `#E5E7EB`, `#D9D9D9`.
  - Borders: `#B8B8B8`, `#C3C3C3`.
- Typography must match the Orgpedia site stack:
  - Base sans-serif: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`.
  - Monospace (if needed): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`.
- Create a small, editable theme configuration (JSON or CSS variables) so brand colors can be adjusted without code changes.
- Theme config must be distinct from the party color JSON.

## Map Behavior
- Default view: Mumbai + English.
- On city change:
  - Load the correct GeoJSON and CSV.
  - Update title, legend, stats, ward details, pie charts, and map bounds.
- Hover:
  - Show ward number + party in a hover label.
- Click:
  - Pin ward details in the side panel.

## Ward Details Panel
- Mumbai: show a single row of ward info (Ward No, Ward Name, Winner, Party, Area if present).
- Pune/PCMC: show a list/table of sub-wards with winner + party per sub-ward.
- Use localized labels and localized field values when available.

## Pie Chart Overlay (Pune/PCMC Only)
- Always render a pie chart for each ward (not only on selection).
- Each chart shows sub-ward seat distribution by party within that ward.
- Color slices by party color mapping.
- Position pie chart at the ward polygon centroid (or another consistent representative point).
- Mumbai does not show pie charts.

## Localization
- All UI strings must toggle based on selected language.
- Provide a JSON file with English and Marathi strings so the user can edit.
- City names in the dropdown should also localize.
- Party labels and winner names should come from `_mr` columns when Marathi is selected.

## Error Handling
- If CSV or GeoJSON fails to load: show a user-facing message in the hover label or panel.
- If a ward has no result: use a fallback color and label (localized).

## Acceptance Criteria
- Default load shows Mumbai map with correct title and English labels.
- Switching city updates map, legend, stats, ward details, and data sources.
- Language toggle updates all UI strings and displayed values.
- Wards are colored using consistent party colors across cities and languages.
- Pune/PCMC wards show majority party color with tie-break on sub-ward "A".
- Ward details show sub-ward breakdown for Pune/PCMC and a single row for Mumbai.
- Pie charts render for Pune/PCMC wards and reflect sub-ward seat distribution.
- Header and footer display Orgpedia branding assets, and the overall color palette matches orgpedia.in.

## Implementation Stages
- Stage 1: UI shell
  - Create `index.html` with header, map card, panel, footer, and brand logos.
  - Add city and language dropdowns.
  - Apply Orgpedia typography and base colors via theme config.
- Stage 2: Data + map
  - Load GeoJSON and CSV for Mumbai.
  - Render ward colors, hover label, and ward details.
  - Generate legend and stats.
- Stage 3: City + language support
  - Add city switching (Mumbai, Pune, PCMC).
  - Add English/Marathi toggle and localized UI strings.
- Stage 4: Sub-ward aggregation + pie charts
  - Implement Pune/PCMC majority logic and tie-break on sub-ward "A".
  - Render sub-ward details table and per-ward pie charts.
