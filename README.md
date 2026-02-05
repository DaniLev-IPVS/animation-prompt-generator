# Animation Prompt Generator

A full-stack web application for generating AI prompts for animation production. Develop stories through chat, generate shot lists, and create detailed prompts for characters, backgrounds, frames, and animations.

## Features

- **Story Development Chat**: Brainstorm and develop your story with AI assistance
- **8-Stage Pipeline**: From concept to animation-ready prompts
- **Secure API Keys**: Your Anthropic API key is encrypted and never exposed
- **Project Management**: Save, load, and share projects
- **Generation History**: Track all AI generations with token usage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js v5 with email/password
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Vercel Postgres, Neon, or local)

### Installation

1. Clone and install dependencies:
```bash
cd animation-prompt-generator
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Configure `.env.local`:
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY="your-32-byte-hex-key"
```

4. Initialize database:
```bash
npx prisma generate
npx prisma db push
```

5. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your production URL)
   - `ENCRYPTION_KEY`
4. Deploy!

## Usage

1. **Register/Login**: Create an account with email and password
2. **Add API Key**: Go to Settings and add your Anthropic API key
3. **Create Project**: Chat with AI to develop your story, or paste directly
4. **Generate**: Walk through the 8 stages to generate all prompts
5. **Export**: Copy prompts or download the full project

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login/Register pages
│   ├── (dashboard)/     # Protected pages
│   ├── api/             # API routes
│   └── shared/          # Public shared projects
├── components/
│   └── generator/       # Main generator component
├── hooks/               # React hooks
├── lib/                 # Utilities (auth, prisma, encryption)
└── types/               # TypeScript types
```

## License

MIT
