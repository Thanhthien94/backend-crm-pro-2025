import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('organizations')
@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({ status: 200, description: 'Returns organization details.' })
  async getOrganization(@Request() req: RequestWithUser) {
    const organization = await this.organizationsService.findById(
      String(req.user.organization),
    );

    return {
      success: true,
      data: organization,
    };
  }

  @Put()
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully.',
  })
  async updateOrganization(
    @Request() req: RequestWithUser,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    const organization = await this.organizationsService.update(
      String(req.user.organization),
      updateOrganizationDto,
    );

    return {
      success: true,
      data: organization,
    };
  }

  @Put('settings')
  @Roles('admin', 'superadmin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  async updateSettings(
    @Request() req: RequestWithUser,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    const organization = await this.organizationsService.updateSettings(
      String(req.user.organization),
      updateSettingsDto,
    );

    return {
      success: true,
      data: organization.settings,
    };
  }
}
