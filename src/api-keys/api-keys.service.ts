import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  async findAll(organizationId: string): Promise<ApiKeyDocument[]> {
    return this.apiKeyModel
      .find({ organization: organizationId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean() // Use lean for better performance
      .exec();
  }

  async findById(id: string, organizationId: string): Promise<ApiKeyDocument> {
    const apiKey = await this.apiKeyModel
      .findOne({ _id: id, organization: organizationId })
      .populate('createdBy', 'name email')
      .lean(); // Added lean() for better performance

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return apiKey;
  }

  private generateApiKey(): string {
    return `ak_${crypto.randomBytes(24).toString('hex')}`;
  }

  async create(
    createApiKeyDto: CreateApiKeyDto,
    organizationId: string,
    userId: string,
  ): Promise<{ apiKey: ApiKeyDocument; generatedKey: string }> {
    // Generate a secure API key
    const generatedKey = this.generateApiKey();

    const apiKey = new this.apiKeyModel({
      ...createApiKeyDto,
      key: generatedKey,
      organization: organizationId,
      createdBy: userId,
      expiresAt: createApiKeyDto.expiresAt
        ? new Date(createApiKeyDto.expiresAt)
        : undefined,
    });

    const savedKey = await apiKey.save();

    // Return both the document and the generated key
    // Note: The key will only be shown once for security
    return {
      apiKey: savedKey,
      generatedKey,
    };
  }

  async update(
    id: string,
    updateApiKeyDto: UpdateApiKeyDto,
    organizationId: string,
  ): Promise<ApiKeyDocument> {
    // Prepare update data
    const updateData: any = { ...updateApiKeyDto };
    if (updateApiKeyDto.expiresAt) {
      updateData.expiresAt = new Date(updateApiKeyDto.expiresAt);
    }

    const apiKey = await this.apiKeyModel
      .findOneAndUpdate({ _id: id, organization: organizationId }, updateData, {
        new: true,
        runValidators: true,
      })
      .populate('createdBy', 'name email')
      .lean();

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    console.log('Updated API key:', apiKey);

    return apiKey;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const result = await this.apiKeyModel
      .deleteOne({
        _id: id,
        organization: organizationId,
      })
      .lean()
      .exec(); // Added lean() for better performance

    if (result.deletedCount === 0) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return true;
  }

  async validateApiKey(key: string): Promise<ApiKeyDocument | null> {
    const apiKey = await this.apiKeyModel
      .findOne({ key, active: true })
      .populate('organization');

    // If key is not found or not active
    if (!apiKey) {
      return null;
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      // Automatically deactivate expired keys
      await this.apiKeyModel.updateOne({ _id: apiKey._id }, { active: false });
      return null;
    }

    // Update last used timestamp
    await this.apiKeyModel.updateOne(
      { _id: apiKey._id },
      { lastUsedAt: new Date() },
    );

    return apiKey;
  }

  async regenerateKey(
    id: string,
    organizationId: string,
  ): Promise<{ apiKey: ApiKeyDocument; generatedKey: string }> {
    // Generate a new secure API key
    const generatedKey = this.generateApiKey();

    const apiKey = await this.apiKeyModel
      .findOneAndUpdate(
        { _id: id, organization: organizationId },
        { key: generatedKey },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'name email');

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    // Return both the document and the generated key
    return {
      apiKey,
      generatedKey,
    };
  }
}
