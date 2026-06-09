import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './output.css';
import App from './App.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { registerServiceWorker } from './utils/registerServiceWorker';
import {
  STUDY_QUERY_GC_TIME_MS,
  STUDY_QUERY_STALE_TIME_MS,
} from './studyHubApi';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: STUDY_QUERY_GC_TIME_MS,
      staleTime: STUDY_QUERY_STALE_TIME_MS,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
      retry: false,
    },
  },
});

registerServiceWorker();

const initMobileShell = async () => {
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (error) {
    console.warn('StatusBar setup skipped:', error);
  }

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.warn('Splash screen hide skipped:', error);
  }
};

void initMobileShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HelmetProvider wraps the app to enable managing the document head */}
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
);
