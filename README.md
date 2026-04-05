# Caloriecounter

React project scaffolded for Vite and TypeScript.

## Features

- Role-based login for general users and admin users.
- Calorie tracking with meal logs, macro summary, and 7-day history.
- AI food scan modal that estimates nutrition from an uploaded food image.
- Dynamic food search using Open Food Facts with optional AI-predicted suggestions.
- Admin panel to add and remove shared custom foods.

## Scripts

- `npm install` installs dependencies.
- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.

## Notes

Node.js was installed locally with nvm during setup.

The project has been verified with:

- `npm install`
- `npm run build`
- `npm run dev`

## Demo Login Credentials

- User: `user@caloriecounter.app` / `user123`
- Admin: `admin@caloriecounter.app` / `admin123`

## AI Scan Setup

Create a `.env.local` file in the project root with:

```env
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_VISION_MODEL=openai/gpt-4o-mini
```

`VITE_OPENROUTER_API_KEY` is required for AI scan. `VITE_VISION_MODEL` is optional.

## Dynamic Food Search

- Search now fetches live food matches from USDA FoodData Central (primary) with Open Food Facts as fallback.
- If `VITE_OPENROUTER_API_KEY` is set, AI-predicted food matches are also shown.
- Search falls back to local/admin food entries when live sources are unavailable.
- Search results are ranked by relevance (exact and strong partial matches first).
- Live search responses are cached in-memory and persisted in localStorage (10-minute TTL) for faster repeated lookups across refreshes.
- You can add foods by servings or grams; grams normalization is optimized for public food results.