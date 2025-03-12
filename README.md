# Exhibition Curation Platform

A platform where users can explore virtual exhibitions from combined collections of antiquities and fine art.

## Project Summary

(Placeholder for project summary - consider adding a video walkthrough link later)

## Running Locally

### Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd exhibition-curation-platform
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory and add the necessary API keys and other environment variables. See `.env.example` (if created) for required variables.
    ```
    # .env
    API_KEY_MUSEUM_A=your_api_key_here
    API_KEY_MUSEUM_B=your_api_key_here
    ```

4.  **Start the development server:**
    ```bash
    npx expo start
    ```
    Follow the instructions in the terminal to open the app on a simulator/emulator or on your physical device via the Expo Go app. To run the web version: press `w` in the terminal after running `npx expo start`.

## Hosting

(Placeholder for instructions on accessing the hosted version)

## Features

- [x] Browse artworks across collections (AIC & Harvard) - Basic source selection implemented.
- [x] Browse artworks with pagination (Single source only for now - AIC/Harvard)
- [x] Filter and/or sort artworks (Client-side sort by Title/Artist for current page)
- [x] Display artwork details
- [x] Add/remove items to/from temporary exhibitions (via Detail Screen)
- [x] View saved exhibitions
