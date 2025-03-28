import { WebhookEvent } from '../enums/webhook-event.enum';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  organization: string;
  data: any;
}
