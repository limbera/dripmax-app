# Dripmax

A React Native app that lets users take photos of their outfits and get AI ratings.

## Features

- Authentication with Google and Apple Sign-In via Supabase
- Camera integration for taking outfit photos
- AI-powered outfit rating (coming soon)
- Dark mode support
- Outfit history tracking

## Tech Stack

- React Native with Expo
- Expo Router for navigation
- Zustand for state management
- Supabase for authentication and database
- TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dripmax.git
cd dripmax
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   - Update the `.env` file with your Supabase credentials

4. Set up Supabase:
   - Create a new Supabase project
   - Enable Google and Apple authentication providers in the Auth settings
   - Add your Supabase URL and anon key to the `.env` file

5. Configure OAuth providers:
   - Set up Google OAuth credentials in the Google Cloud Console
   - Set up Apple Sign In in the Apple Developer Portal
   - Add the redirect URL `dripmax://auth/callback` to both providers

6. Start the development server:
```bash
npm start
```

## Project Structure

- `app/` - Expo Router screens and layouts
  - `(auth)/` - Authentication screens
  - `(protected)/` - Protected screens (require authentication)
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `services/` - API and service integrations
- `stores/` - Zustand state stores
- `constants/` - App-wide constants and configuration

## Authentication Flow

1. User opens the app
2. If not authenticated, user is redirected to the login screen
3. User signs in with Google or Apple
4. On successful authentication, user is redirected to the home screen
5. Authentication state is persisted using SecureStore

## Development

### Adding New Screens

1. Create a new file in the appropriate directory under `app/`
2. Export a React component as the default export
3. The file name will determine the route path

### State Management

- Use Zustand stores for global state management
- Create stores in the `stores/` directory
- Use the immer middleware for complex state updates

## Troubleshooting

### Authentication Issues

- Make sure your Supabase URL and anon key are correctly set in the `.env` file
- Check that your OAuth providers are properly configured in Supabase
- Verify that the redirect URL `dripmax://auth/callback` is added to your OAuth providers

### Navigation Issues

- If you encounter navigation errors, check that your route paths are correctly formatted
- Make sure all screen components have a proper default export

## License

MIT
