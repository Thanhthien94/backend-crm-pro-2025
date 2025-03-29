import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { Webhook, WebhookDocument } from './schemas/webhook.schema';
import { WebhookEvent } from './enums/webhook-event.enum';
import { WebhookPayload } from './interfaces/webhook-payload.interface';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(Webhook.name) private webhookModel: Model<WebhookDocument>,
    private readonly httpService: HttpService,
  ) {}

  async findAll(organizationId: string): Promise<WebhookDocument[]> {
    return this.webhookModel
      .find({ organization: organizationId })
      .populate('createdBy', 'name email')
      .exec();
  }

  async findOne(id: string, organizationId: string): Promise<WebhookDocument> {
    const webhook = await this.webhookModel
      .findOne({ _id: id, organization: organizationId })
      .populate('createdBy', 'name email')
      .exec();

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  async create(
    createWebhookDto: CreateWebhookDto,
    organizationId: string,
    userId: string,
  ): Promise<WebhookDocument> {
    const webhook = new this.webhookModel({
      ...createWebhookDto,
      organization: organizationId,
      createdBy: userId,
      secretKey: crypto.randomBytes(32).toString('hex'),
    });

    return webhook.save();
  }

  async update(
    id: string,
    updateWebhookDto: UpdateWebhookDto,
    organizationId: string,
  ): Promise<WebhookDocument> {
    const webhook = await this.webhookModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        updateWebhookDto,
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'name email');

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    return webhook;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const webhook = await this.webhookModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await webhook.deleteOne();
    return true;
  }

  async resetSecret(id: string, organizationId: string): Promise<string> {
    const webhook = await this.webhookModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    // Generate new secret key
    webhook.secretKey = crypto.randomBytes(32).toString('hex');
    await webhook.save();

    return webhook.secretKey;
  }

  async testWebhook(
    id: string,
    organizationId: string,
  ): Promise<{
    success: boolean;
    statusCode?: number;
    message: string;
    response?: unknown;
  }> {
    const webhook = await this.webhookModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    // Test payload
    const testPayload = {
      event: webhook.events[0] || WebhookEvent.CUSTOMER_CREATED,
      timestamp: Date.now(),
      organization: organizationId,
      data: {
        test: true,
        message: 'This is a test webhook payload',
      },
    };

    // Generate signature
    const signature = webhook.generateSignature(testPayload);

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-CRM-Signature': signature,
      'X-CRM-Event': testPayload.event,
      ...webhook.headers,
    };

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(webhook.url, testPayload, { headers, timeout: 10000 })
          .pipe(
            catchError((error: AxiosError) => {
              this.logger.error(
                `Test webhook failed: ${error.message}`,
                error.stack,
              );

              return Promise.resolve({
                status: error.response?.status || 500,
                data: error.response?.data || { error: error.message },
              });
            }),
          ),
      );

      // Update last triggered timestamp
      await this.webhookModel.updateOne(
        { _id: webhook._id },
        { lastTriggered: new Date() },
      );

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        message:
          response.status >= 200 && response.status < 300
            ? 'Test webhook sent successfully'
            : `Test webhook failed with status code ${response.status}`,
        response: response.data,
      };
    } catch (error) {
      this.logger.error(
        `Test webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        message: `Test webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async triggerWebhook(
    event: WebhookEvent,
    organizationId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Find all active webhooks for this organization and event
      const webhooks = await this.webhookModel.find({
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
          const { status } = await firstValueFrom(
            this.httpService
              .post(webhook.url, payload, { headers, timeout: 10000 })
              .pipe(
                catchError((error: AxiosError) => {
                  throw error;
                }),
              ),
          );

          // Update webhook status
          webhook.lastTriggered = new Date();
          if (webhook.status === 'failed') {
            webhook.status = 'active';
          }
          webhook.failureCount = 0;
          await webhook.save();

          this.logger.log(
            `Webhook ${webhook.name} triggered successfully for event: ${event}`,
          );

          return {
            success: true,
            webhookId: webhook._id,
            statusCode: status,
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

          this.logger.error(
            `Webhook ${webhook.name} failed for event: ${event}. Error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
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
      this.logger.error(
        `Error triggering webhooks for event ${event}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
