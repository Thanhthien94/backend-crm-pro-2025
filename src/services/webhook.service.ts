import axios from 'axios';
import Webhook from '../models/Webhook';
import logger from '../config/logger';

export enum WebhookEvent {
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  DEAL_CREATED = 'deal.created',
  DEAL_UPDATED = 'deal.updated',
  DEAL_STAGE_CHANGED = 'deal.stage_changed',
  DEAL_DELETED = 'deal.deleted',
  TASK_CREATED = 'task.created',
  TASK_COMPLETED = 'task.completed',
  TASK_DELETED = 'task.deleted',
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  organization: string;
  data: any;
}

export const triggerWebhooks = async (
  event: WebhookEvent,
  organizationId: string,
  data: any
): Promise<void> => {
  try {
    // Find all active webhooks for this organization and event
    const webhooks = await Webhook.find({
      organization: organizationId,
      events: event,
      status: 'active',
    });

    if (webhooks.length === 0) {
      return;
    }

    // Prepare payload
    const payload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      organization: organizationId,
      data,
    };

    // Send webhook requests in parallel
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        // Generate signature
        const signature = webhook.generateSignature(payload);

        // Prepare headers
        const headers = {
          'Content-Type': 'application/json',
          'X-CRM-Signature': signature,
          'X-CRM-Event': event,
          ...webhook.headers,
        };

        // Send webhook
        const response = await axios.post(webhook.url, payload, {
          headers,
          timeout: 10000, // 10 second timeout
        });

        // Update webhook status
        webhook.lastTriggered = new Date();
        if (webhook.status === 'failed') {
          webhook.status = 'active';
        }
        webhook.failureCount = 0;
        await webhook.save();

        logger.info(`Webhook ${webhook.name} triggered successfully for event: ${event}`);

        return {
          success: true,
          webhookId: webhook._id,
          statusCode: response.status,
        };
      } catch (error) {
        // Update failure status
        webhook.failureCount += 1;
        webhook.lastTriggered = new Date();

        // If failed 3 times in a row, mark as failed
        if (webhook.failureCount >= 3) {
          webhook.status = 'failed';
        }

        await webhook.save();

        logger.error(
          `Webhook ${webhook.name} failed for event: ${event}. Error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );

        return {
          success: false,
          webhookId: webhook._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Wait for all webhooks to complete
    await Promise.all(webhookPromises);
  } catch (error) {
    logger.error(
      `Error triggering webhooks for event ${event}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
};
