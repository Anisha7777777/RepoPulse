# RepoPulse

RepoPulse is a single-page dashboard for exploring public GitHub repositories. It uses React, TypeScript, Vite, and Recharts. The interface is designed around one repository at a time.

## Live demo

[Open RepoPulse](https://repopulse-hdjm.onrender.com/)

## Run locally

Use PowerShell from the project folder:

```powershell
Set-Location 'C:\Users\cutie\Documents\Codex\2026-11-03\files-pasted-by-the-user-build\outputs\repopulse'
npm.cmd install
npm.cmd run dev
```

Open the **Local** address printed by Vite. It normally starts at `http://127.0.0.1:5173/`; Vite chooses another port if that port is busy. `npm.cmd` works in PowerShell installations where the `npm.ps1` script is blocked by the execution policy.

Other checks: `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd run typecheck`.

## What the app does

- Search for a public repository using `owner/repository`. The form validates the format, then requests live details from GitHub. The overview shows the name, owner, description, stars, forks, GitHub's open issues and pull requests count, primary language, and last push date when available. A fixed `facebook/react` sample preview is clearly labeled as sample data; the `vercel/next.js` shortcut performs a live search.
- Show recent commits in a bar chart grouped by UTC date. Choose 7, 30, or 90 days. The count and chart use at most the first 100 commits returned for the selected period.
- Show an Attention inbox of open issues and pull requests with no GitHub updates for at least 7, 14, or 30 days. Filter by item type. The rule uses `updated_at`; it is a review cue, **not evidence** that a maintainer has not responded or a pull request awaits review.
- Save a point-in-time snapshot of the live repository overview, current commit count and range, and Attention count, threshold, and filter. Compare two saved captures of the same repository, delete one capture, or clear all captures after confirmation. Missing metrics are shown as unavailable.

Each live section has its own loading, empty, and error state. An activity or inbox failure does not remove the repository overview or saved comparisons.

## Data and storage

The browser calls GitHub's public REST API directly, without an API key or backend:

- `GET /repos/{owner}/{repository}` for the overview
- `GET /repos/{owner}/{repository}/commits?per_page=100&since=...` for activity
- `GET /repos/{owner}/{repository}/issues?state=open&sort=updated&direction=asc&per_page=100` for the Attention inbox; GitHub includes pull requests in this endpoint

Snapshots are stored only in this browser's `localStorage` under `repopulse.snapshots.v1`. They do not sync or update automatically. Clearing browser site data removes them. If saved data is malformed, RepoPulse skips invalid captures and reports the problem; a new save can replace unreadable storage data.

## Limits

- GitHub limits unauthenticated REST API requests, typically to 60 requests per hour per originating IP address. Other users sharing an IP may use the same quota. The app displays rate-limit failures and a retry time when GitHub provides one.
- The commit chart and Attention inbox read one page of up to 100 items each. They label partial results when GitHub reports another page. Their counts are **not** guaranteed to represent the entire repository or date range.
- The GitHub `open_issues_count` field includes open issues and pull requests. Attention results are sorted by oldest update, and a stale `updated_at` timestamp says only that GitHub has recorded no update in that period.
- Snapshot comparisons use saved values. Commit counts are comparable only when date ranges match; Attention counts require matching threshold and filter. A partial capture can make a difference incomplete.
- Public repositories may have missing fields or no accessible commits. Network failures and GitHub API limits can prevent live data from loading. The sample preview is illustrative and never refreshes.
