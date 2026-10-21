import { SetMetadata } from '@nestjs/common';

export const SKIP_RESPONSE_ENVELOPE_METADATA_KEY =
  'SKIP_RESPONSE_ENVELOPE_METADATA_KEY';

/**
 * Decorator to opt-out of the global JSON response envelope.
 * Useful for endpoints returning streams, raw binary buffers, file downloads, or SSE.
 * Example: @SkipResponseEnvelope()
 */
export const SkipResponseEnvelope = () =>
  SetMetadata(SKIP_RESPONSE_ENVELOPE_METADATA_KEY, true);
