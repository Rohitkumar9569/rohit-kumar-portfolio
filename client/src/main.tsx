import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './output.css';
import App from './App.tsx';
import 'react-spring-bottom-sheet/dist/style.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext'; // Import ThemeProvider

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider> {/* Wrap everything inside ThemeProvider */}
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);