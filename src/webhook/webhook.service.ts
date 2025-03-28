import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly httpService: HttpService) {}

  async triggerWebhook(
    url: string,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<unknown> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Failed to send webhook: ${error.message}`);
            throw error;
          }),
        ),
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
