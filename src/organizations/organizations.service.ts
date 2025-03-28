import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    const newOrganization = new this.organizationModel(createOrganizationDto);
    return newOrganization.save();
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizationModel
      .findByIdAndUpdate(id, updateOrganizationDto, { new: true })
      .exec();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  async updateSettings(
    id: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<Organization> {
    const organization = await this.organizationModel.findById(id).exec();

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    // Merge existing settings with new settings
    const currentSettings = organization.settings || {
      theme: 'light',
      notifications: true,
      modules: {
        customers: true,
        deals: true,
        tasks: true,
        reports: false,
      },
    };

    organization.settings = {
      ...currentSettings,
      ...updateSettingsDto,
      // Ensure modules object is properly merged
      modules: {
        ...currentSettings.modules,
        ...(updateSettingsDto.modules || {}),
      },
    };

    return organization.save();
  }
}
