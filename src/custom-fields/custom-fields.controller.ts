import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { EntityType } from './schemas/custom-field.schema';

@ApiTags('custom-fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @Roles('admin')
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Create a new custom field' })
  @ApiResponse({
    status: 201,
    description: 'Custom field created successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({
    status: 409,
    description: 'Custom field with this key already exists.',
  })
  @ApiBearerAuth()
  async create(
    @Body() createCustomFieldDto: CreateCustomFieldDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      const customField = await this.customFieldsService.create(
        createCustomFieldDto,
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: customField,
      };
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new BadRequestException(
          `Custom field with key '${createCustomFieldDto.key}' already exists for this entity`,
        );
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all custom fields' })
  @ApiResponse({ status: 200, description: 'Returns all custom fields.' })
  @ApiQuery({
    name: 'entity',
    required: false,
    enum: EntityType,
    description: 'Filter by entity type',
  })
  @ApiBearerAuth()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('entity') entity?: EntityType,
  ) {
    const customFields = await this.customFieldsService.findAll(
      req.user.organization.toString(),
      entity,
    );

    return {
      success: true,
      count: customFields.length,
      data: customFields,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a custom field by id' })
  @ApiResponse({ status: 200, description: 'Returns the custom field.' })
  @ApiResponse({ status: 404, description: 'Custom field not found.' })
  @ApiParam({ name: 'id', description: 'Custom field ID' })
  @ApiBearerAuth()
  async findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const customField = await this.customFieldsService.findById(
      id,
      req.user.organization.toString(),
    );

    return {
      success: true,
      data: customField,
    };
  }

  @Patch(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update a custom field' })
  @ApiResponse({
    status: 200,
    description: 'Custom field updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 404, description: 'Custom field not found.' })
  @ApiResponse({
    status: 409,
    description: 'Custom field with this key already exists.',
  })
  @ApiParam({ name: 'id', description: 'Custom field ID' })
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateCustomFieldDto: UpdateCustomFieldDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      const customField = await this.customFieldsService.update(
        id,
        updateCustomFieldDto,
        req.user.organization.toString(),
      );

      return {
        success: true,
        data: customField,
      };
    } catch (error) {
      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new BadRequestException(
          `Custom field with key '${updateCustomFieldDto.key}' already exists for this entity`,
        );
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a custom field' })
  @ApiResponse({
    status: 200,
    description: 'Custom field deleted successfully.',
  })
  @ApiResponse({ status: 404, description: 'Custom field not found.' })
  @ApiParam({ name: 'id', description: 'Custom field ID' })
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.customFieldsService.remove(id, req.user.organization.toString());

    return {
      success: true,
      message: 'Custom field deleted successfully',
      data: {},
    };
  }

  @Get('entity/:entity')
  @ApiOperation({ summary: 'Get custom fields for a specific entity' })
  @ApiResponse({
    status: 200,
    description: 'Returns custom fields for the entity.',
  })
  @ApiParam({
    name: 'entity',
    enum: EntityType,
    description: 'Entity type (customer, deal, task)',
  })
  @ApiBearerAuth()
  async getFieldsByEntity(
    @Param('entity') entity: EntityType,
    @Request() req: RequestWithUser,
  ) {
    const customFields = await this.customFieldsService.getFieldsByEntity(
      entity,
      req.user.organization.toString(),
    );

    return {
      success: true,
      count: customFields.length,
      data: customFields,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate custom fields data' })
  @ApiResponse({ status: 200, description: 'Validation results.' })
  @ApiBearerAuth()
  async validateCustomFields(
    @Body()
    body: {
      entity: EntityType;
      customFields: Record<string, any>;
    },
    @Request() req: RequestWithUser,
  ) {
    const { entity, customFields } = body;

    if (!entity || !customFields) {
      throw new BadRequestException(
        'Entity type and customFields are required',
      );
    }

    const validationResult =
      await this.customFieldsService.validateCustomFields(
        entity,
        req.user.organization.toString(),
        customFields,
      );

    return {
      success: validationResult.valid,
      data: validationResult,
    };
  }
}
