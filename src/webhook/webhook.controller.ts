import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { AccessControl } from 'src/access-control/decorators/access-control.decorator';
import { AccessControlGuard } from 'src/access-control/guards/access-control.guard';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @UseGuards(AccessControlGuard)
  @AccessControl('webhook', 'create')
  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully.' })
  @ApiBearerAuth()
  async create(
    @Body() createWebhookDto: CreateWebhookDto,
    @Request() req: RequestWithUser,
  ) {
    const webhook = await this.webhookService.create(
      createWebhookDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: webhook,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'Returns all webhooks.' })
  @ApiBearerAuth()
  async findAll(@Request() req: RequestWithUser) {
    const webhooks = await this.webhookService.findAll(
      req.user.organization.toString(),
    );

    return {
      success: true,
      count: webhooks.length,
      data: webhooks,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by id' })
  @ApiResponse({ status: 200, description: 'Returns the webhook.' })
  @ApiResponse({ status: 404, description: 'Webhook not found.' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const webhook = await this.webhookService.findOne(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: webhook,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated successfully.' })
  @ApiResponse({ status: 404, description: 'Webhook not found.' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateWebhookDto: UpdateWebhookDto,
    @Request() req: RequestWithUser,
  ) {
    const webhook = await this.webhookService.update(
      id,
      updateWebhookDto,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: webhook,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Webhook not found.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.webhookService.remove(id, req.user.organization.toString());

    return {
      success: true,
      data: {},
    };
  }

  @Post(':id/reset-secret')
  @ApiOperation({ summary: 'Reset webhook secret key' })
  @ApiResponse({ status: 200, description: 'Secret key reset successfully.' })
  @ApiResponse({ status: 404, description: 'Webhook not found.' })
  @ApiBearerAuth()
  async resetSecret(@Param('id') id: string, @Request() req: RequestWithUser) {
    const secretKey = await this.webhookService.resetSecret(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: {
        secretKey,
      },
      message: 'Store this secret key securely, it will not be shown again.',
    };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook tested successfully.' })
  @ApiResponse({ status: 404, description: 'Webhook not found.' })
  @ApiBearerAuth()
  async testWebhook(@Param('id') id: string, @Request() req: RequestWithUser) {
    const result = await this.webhookService.testWebhook(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: result,
    };
  }
}
