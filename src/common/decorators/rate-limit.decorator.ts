import { SetMetadata } from '@nestjs/common';

export const RateLimit = (points = 100, duration = 60) =>
  SetMetadata('rate-limit', { points, duration });
