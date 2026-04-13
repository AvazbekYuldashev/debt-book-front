# Debt Book (React Native UI)

This repository contains the frontend UI for a debt tracker application built with React Native and Expo. It supports Android, iOS, and web platforms. The backend will be provided later (Spring Boot).

## Structure

- `App.tsx` – main entry point.
- `src/navigation` – contains bottom tab navigator configuration.
- `src/screens` – UI redesigned with modern cards, spacing and typography; includes debt list with summary, contact details screen, and editing modal.
  Additionally there are authentication screens (login, registration, SMS verification, password reset) that communicate with the backend API.

## Getting started

1. Install [Node.js](https://nodejs.org/) and [Expo CLI](https://docs.expo.dev/workflow/expo-cli/):
   ```bash
   npm install -g expo-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run start
   ```

4. Open on a device or emulator:
   - Press `a` to open Android emulator
   - Press `i` for iOS simulator
   - Press `w` for web

## Conventions

- Follow **DRY**, **KISS**, and **SOLID** principles.
- Screens are small and easily testable.
- Add components under `src/components` when needed.
- Contacts are managed via context and navigable to a detail screen where you can view/edit information and later see transaction history.
- Authentication flow uses `AuthContext` and switches between login stack and main tabs. Profile screen now displays basic user info and includes a logout button.
- Password reset is performed by phone number rather than username per backend DTO changes.
- Visual design uses a clean color palette, consistent spacing, and card components to resemble polished mobile apps. Summary statistics are displayed in separate cards, list items include navigation icons, and detail screens feature headers and refined typography.

## Next steps

After UI review, backend APIs will be shared to integrate data fetching and networking.

