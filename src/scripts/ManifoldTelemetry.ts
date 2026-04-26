export type ManifoldAnalyticsEventName =
  | 'intro_entered'
  | 'card_expanded'
  | 'mode_switched'
  | '4d_mode_entered'
  | 'audio_played'
  | 'js_error'
  | 'profile_recording_started';

export interface ManifoldAnalyticsPayload {
  cardId?: string;
  durationMs?: number;
  from?: '2d' | '3d' | '4d';
  to?: '2d' | '3d' | '4d';
  error?: {
    message: string;
    stack?: string;
    type: 'window_error' | 'unhandled_rejection';
  };
}

interface ManifoldAnalyticsEvent {
  event: ManifoldAnalyticsEventName;
  payload?: ManifoldAnalyticsPayload;
  timestamp: string;
  path: string;
}

const DEFAULT_ENDPOINT = '/api/telemetry/manifold';

export class ManifoldTelemetry {
  constructor(private readonly endpoint: string | null) {}

  track(event: ManifoldAnalyticsEventName, payload?: ManifoldAnalyticsPayload): void {
    const body: ManifoldAnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    };
    if (payload) {
      body.payload = payload;
    }

    if (!this.endpoint) {
      return;
    }

    try {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
    } catch {
      // Ignore beacon failures
    }
  }

  installGlobalErrorHandlers(): () => void {
    const handleError = (e: ErrorEvent) => {
      console.error('[Global Error]', e);
      this.track('js_error', {
        error: {
          message: e.message || 'Unknown Error',
          stack: e.error instanceof Error ? e.error.stack : undefined,
          type: 'window_error'
        }
      });
    };

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      console.error('[Unhandled Rejection]', e);
      const reason = e.reason;
      this.track('js_error', {
        error: {
          message: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined,
          type: 'unhandled_rejection'
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }
}

export function resolveTelemetryEndpoint(): string | null {
  const raw = import.meta.env.PUBLIC_MANIFOLD_ANALYTICS_ENDPOINT?.trim();
  if (!raw) {
    return null;
  }

  return raw === 'beacon' ? DEFAULT_ENDPOINT : raw;
}
