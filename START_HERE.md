# RoadRisk Delhi (Replit design): run locally

1. Install Node.js 20 or newer (nodejs.org).
2. In this folder:  `npm install`
3. Start:  `npm run dev`  then open http://localhost:3000
   (API is served under /rr-api/..., e.g. http://localhost:3000/rr-api/health)
4. Checks:  `npm run lint`  (type-check)   and   `npm run build`

The first load rebuilds the scores into public/data (a few seconds).
Pages: /  /planner  /explore  /citizen  /reliability  /preflight
