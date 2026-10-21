import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_METADATA_KEY = 'RESPONSE_MESSAGE_METADATA_KEY';

/**
 * Decorator to set a custom success message for an endpoint response envelope.
 * Example: @ResponseMessage('User retrieved successfully')
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_METADATA_KEY, message);
