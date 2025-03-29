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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { RateLimit } from 'src/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @RateLimit(5, 60) // Giới hạn 5 request mỗi 60 giây
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully.' })
  @ApiBearerAuth()
  async create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @Request() req: RequestWithUser,
  ) {
    const { apiKey, generatedKey } = await this.apiKeysService.create(
      createApiKeyDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: {
        ...apiKey.toObject(),
        key: generatedKey, // Only time the full key is returned
      },
      message: 'Store this API key securely, it will not be shown again.',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'Returns all API keys.' })
  @ApiBearerAuth()
  async findAll(@Request() req: RequestWithUser) {
    const apiKeys = await this.apiKeysService.findAll(
      req.user.organization.toString(),
    );

    return {
      success: true,
      count: apiKeys.length,
      data: apiKeys,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an API key by id' })
  @ApiResponse({ status: 200, description: 'Returns the API key.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const apiKey = await this.apiKeysService.findById(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: apiKey,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @Request() req: RequestWithUser,
  ) {
    const apiKey = await this.apiKeysService.update(
      id,
      updateApiKeyDto,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: apiKey,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.apiKeysService.remove(
      id,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: {},
    };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key regenerated successfully.',
  })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  @ApiBearerAuth()
  async regenerate(@Param('id') id: string, @Request() req: RequestWithUser) {
    const { apiKey, generatedKey } = await this.apiKeysService.regenerateKey(
      id,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: {
        ...apiKey.toObject(),
        key: generatedKey, // Only time the full key is returned
      },
      message: 'Store this API key securely, it will not be shown again.',
    };
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update API key resource permissions' })
  @ApiResponse({
    status: 200,
    description: 'API key permissions updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  @ApiBearerAuth()
  async updatePermissions(
    @Param('id') id: string,
    @Body()
    permissions: Array<{
      resource: string;
      actions: string[];
    }>,
    @Request() req: RequestWithUser,
  ) {
    const apiKey = await this.apiKeysService.updateResourcePermissions(
      id,
      permissions,
      req.user.organization.toString(),
      req.user._id?.toString() || '',
    );

    return {
      success: true,
      data: apiKey,
    };
  }
}
