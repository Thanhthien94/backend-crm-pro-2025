import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CustomField,
  CustomFieldDocument,
  EntityType,
} from './schemas/custom-field.schema';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectModel(CustomField.name)
    private customFieldModel: Model<CustomFieldDocument>,
  ) {}

  async findAll(
    organizationId: string,
    entity?: EntityType,
  ): Promise<CustomFieldDocument[]> {
    const query: { organization: string; entity?: EntityType } = {
      organization: organizationId,
    };

    if (entity) {
      query.entity = entity;
    }

    return this.customFieldModel
      .find(query)
      .sort({ displayOrder: 1, createdAt: 1 })
      .exec();
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CustomFieldDocument> {
    const customField = await this.customFieldModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!customField) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }

    return customField;
  }

  async create(
    createCustomFieldDto: CreateCustomFieldDto,
    organizationId: string,
  ): Promise<CustomFieldDocument> {
    // Check if field with same key already exists for this entity and organization
    const existingField = await this.customFieldModel.findOne({
      key: createCustomFieldDto.key,
      entity: createCustomFieldDto.entity,
      organization: organizationId,
    });

    if (existingField) {
      throw new ConflictException(
        `Custom field with key '${createCustomFieldDto.key}' already exists for this entity`,
      );
    }

    const customField = new this.customFieldModel({
      ...createCustomFieldDto,
      organization: organizationId,
    });

    return customField.save();
  }

  async update(
    id: string,
    updateCustomFieldDto: UpdateCustomFieldDto,
    organizationId: string,
  ): Promise<CustomFieldDocument> {
    // Check if we're updating the key and if it already exists
    if (updateCustomFieldDto.key) {
      const existingField = await this.customFieldModel.findOne({
        key: updateCustomFieldDto.key,
        entity:
          updateCustomFieldDto.entity ||
          (await this.findById(id, organizationId)).entity,
        organization: organizationId,
        _id: { $ne: id }, // Exclude the current field
      });

      if (existingField) {
        throw new ConflictException(
          `Custom field with key '${updateCustomFieldDto.key}' already exists for this entity`,
        );
      }
    }

    const customField = await this.customFieldModel.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updateCustomFieldDto,
      { new: true, runValidators: true },
    );

    if (!customField) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }

    return customField;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const result = await this.customFieldModel.deleteOne({
      _id: id,
      organization: organizationId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Custom field with ID ${id} not found`);
    }

    return true;
  }

  async getFieldsByEntity(
    entity: EntityType,
    organizationId: string,
  ): Promise<CustomFieldDocument[]> {
    return this.customFieldModel
      .find({
        entity,
        organization: organizationId,
        active: true,
      })
      .sort({ displayOrder: 1, createdAt: 1 })
      .exec();
  }

  async validateCustomFields(
    entity: EntityType,
    organizationId: string,
    customFields: Record<string, any>,
  ): Promise<{ valid: boolean; errors?: Record<string, string> }> {
    // Get all defined custom fields for this entity and organization
    const definedFields = await this.getFieldsByEntity(entity, organizationId);

    const errors: Record<string, string> = {};

    // Check if required fields are present
    for (const field of definedFields) {
      if (
        field.required &&
        (customFields[field.key] === undefined ||
          customFields[field.key] === null)
      ) {
        errors[field.key] = `Field '${field.name}' is required`;
      }
    }

    // Check if any undefined fields are passed
    const definedKeys = new Set(definedFields.map((field) => field.key));
    for (const key of Object.keys(customFields)) {
      if (!definedKeys.has(key)) {
        errors[key] = `Field '${key}' is not defined for this entity`;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }
}
