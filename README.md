# YT Taste AI

I built YT Taste AI as a fun side project to turn a YouTube watch-history export into something a little more interesting than a raw JSON file. The idea was simple: take the data, make sense of it, and turn it into a dashboard that feels more like an actual product than a static parser.

It is a local-first app that lets you upload your watch history, process it, and explore your viewing patterns through a polished dashboard. I also added a sample mode so people can try it even without uploading their own data.

## What it does

- Uploads a YouTube watch-history JSON file
- Parses and normalizes the data on the backend
- Builds a structured profile with summaries and inferred interests
- Shows a dashboard with charts, category breakdowns, top creators, and activity insights
- Supports a built-in sample mode for quick demoing
- Lets users save and revisit reports locally in the browser

## Why I made it

I wanted to build something that felt useful, visual, and a bit personal. A watch-history export is full of interesting information, but most of it is buried in messy files. This project tries to make that data feel more understandable and a little more fun to explore.

## Tech stack

- Frontend: Next.js + React + TypeScript
- Backend: Node.js + Express
- Styling: Tailwind CSS
- Local data flow: JSON upload + processing + dashboard rendering

## Project structure

- frontend: the UI and dashboard experience
- backend: upload handling, parsing, and analysis logic

## Getting started

### 1. Install dependencies

In the backend folder:

```bash
cd backend
npm install
```

In the frontend folder:

```bash
cd frontend
npm install
```

### 2. Start the backend

```bash
cd backend
npm start
```

The backend should run locally on port 4000.

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## How to use it

1. Open the app in the browser.
2. Either upload a watch-history JSON file or try the built-in sample dashboard.
3. Explore the summary cards, charts, and insights.
4. Save a report if you want to revisit it later.

## Notes

This project is meant to be a polished demo and portfolio piece rather than a perfect analytics engine. The insights are heuristic and based on the data available in the export, but the experience is designed to feel clean, interactive, and realistic.

## Future ideas

There are a lot of ways I’d like to grow this project further:

- add authentication and saved profiles
- connect it to a real database
- add more advanced analytics and recommendations
- deploy it online
- improve the accuracy of the analysis with better parsing and smarter classification

If you want, I can also help turn this into a more polished GitHub-style README with a screenshot section, architecture diagram, and a cleaner project showcase layout.
