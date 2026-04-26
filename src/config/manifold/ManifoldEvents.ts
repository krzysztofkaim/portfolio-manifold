/**
 * Event name for triggering a profile recording session.
 */
export const EVENT_RECORD_PROFILE = 'manifold:record-profile';

/**
 * Payload for the record-profile event.
 */
export interface RecordProfileDetail {
  /**
   * Duration of the recording in milliseconds.
   */
  durationMs: number;
}
