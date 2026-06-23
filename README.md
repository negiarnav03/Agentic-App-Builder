

## Getting Started
npx create-next-app@latest

npx shadcn@latest init

npx shadcn@latest add badge dialog dropdown-menu sonner tabs textarea

npx shadcn@latest add @animate-ui/components-backgrounds-hole

npm i react-spinners


# First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

# clerk for authentication
npx @clerk/nextjs@latest init


# supabase for integration

npm install prisma --save-dev 
npm install pg

npx prisma init
npm install @prisma/adapter-pg
npm i @prisma/client
npm i @prisma/client pg

npx prisma generate     // genrate the prisma client
npx prisma migrate dev   // apply the migration
npx prisma migrate dev --name init  // if the upper one doesn't work.

npm install @supabase/supabase-js

npm i zod


# Arcjet for security
npm i @arcjet/next


# Cline SDK for Ai
npm install @cline/sdk


# installation of sandpack
npm install @codesandbox/sandpack-react @codesandbox/sandpack-themes  // it let us to run the js and node.js app in any browser.


# install react markdown

npm install react-markdown


# for Google Gen AI
npm install @google/genai



# Features
## Landing Page
Prompt textarea with rotating placeholders and suggestion chips
Live browser mockup preview
Features section, how-it-works steps, pricing table (Clerk <PricingTable />)
Dark theme throughout

## Auth (Clerk)
Google OAuth sign-in
User auto-created in Supabase on first login with free credits
Plan detection via Clerk has() — credits top-up on plan upgrade
Pricing modal accessible from the header credit badge

## Workspace
Split-panel layout: Chat (left) + Code/Preview (right)
Full persistent chat history stored in Supabase
AI responses rendered with react-markdown and a live blinking cursor during streaming
Image upload via paperclip → Supabase Storage → CDN URL injected into prompt
Auto-scroll, hidden scrollbar, user avatars

## AI Code Generation (/api/gen-ai-code)
Gemini 3.5 Flash with thinkingConfig enabled
Streams Gemini thought labels as live status steps in the chat panel
Returns strict JSON: { assistantMessage, title, files, dependencies }
npm registry validation — hallucinated packages silently filtered
Atomic DB transaction: workspace upsert + credit deduction in one operation

## Improve with AI — Cline SDK (/api/improve) — Pro + Starter
Cline Agent with two tools: update_file + done_improving
Agent streams reasoning live into the chat panel as it works
Files patched one at a time via SSE — Sandpack updates without remounting
lifecycle: { completesRun: true } ends the agent cleanly after all files are done
Gated to Starter and Pro plans

## Fix with AI
Sandpack listens for runtime + compile errors
Error banner appears in Preview tab with "Fix with AI" button
Injects the error + context into Gemini and triggers a new generation

## Code Panel (Sandpack)
Preview and Code tabs — auto-switches to Preview after each generation
Built-in CodeMirror editor (read-only), file explorer
Tailwind v3 loaded via CDN inside the preview iframe
Smart re-keying: SandpackProvider only remounts when file paths change, not contents
Export to ZIP — downloads a ready-to-run CRA project with package.json

## Projects Page
Grid of all past workspaces with title, first prompt preview, message count, timestamp
Delete project with confirmation modal
Empty state with CTA

## Token / Credit System
Free: 10 credits · Starter: 50 · Pro: 150
Cost: 1 credit per generation or improve
Checked client-side and server-side (402 response as backup)
Credits top up additively on plan upgrade, preserved on downgrade