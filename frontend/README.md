# SomPheas Frontend

Modern, performant Next.js frontend for SomPheas.

## Features

- ⚡ **Performance Optimized**: Built with Next.js 14 App Router, React Query, and optimized components
- 🎨 **Modern UI**: Beautiful design system with shadcn/ui components
- 🔐 **Authentication**: Secure JWT-based authentication with Zustand state management
- 📱 **Responsive**: Mobile-first design that works on all devices
- ♿ **Accessible**: WCAG compliant components
- 🚀 **Production Ready**: Optimized for performance and maintainability

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:8003
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/          # Dashboard pages
│   ├── layout.tsx          # Root layout
│   └── providers.tsx      # React Query provider
├── components/             # React components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/                    # Utilities and helpers
│   ├── api/               # API client and endpoints
│   └── store/             # Zustand stores
└── public/                 # Static assets
```

## Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- React Query for efficient data fetching and caching
- Optimized bundle size with tree-shaking
- Compression enabled
- DNS prefetching headers

## Design System

The design system uses a professional color palette:
- **Primary**: Professional blue for main actions
- **Secondary**: Subtle gray for secondary actions
- **Destructive**: Red for errors and destructive actions
- **Muted**: Light backgrounds for subtle elements

All colors support both light and dark modes.

## Building for Production

```bash
npm run build
npm start
```
