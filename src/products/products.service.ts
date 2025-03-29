import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { WebhookService } from '../webhook/webhook.service';
import { WebhookEvent } from '../webhook/enums/webhook-event.enum';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private webhookService: WebhookService,
  ) {}

  async findAll(
    organizationId: string,
    filters: {
      status?: string;
      search?: string;
    } = {},
    page = 1,
    limit = 10,
  ): Promise<{
    products: ProductDocument[];
    total: number;
  }> {
    type QueryType = {
      organization: string;
      status?: string;
      $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
    };

    const query: QueryType = { organization: organizationId };

    if (filters.status) query.status = filters.status;

    // Handle search filter
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const startIndex = (page - 1) * limit;
    const total = await this.productModel.countDocuments(query);

    const products = await this.productModel
      .find(query)
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    return { products, total };
  }

  async findById(id: string, organizationId: string): Promise<ProductDocument> {
    const product = await this.productModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(
    createProductDto: CreateProductDto,
    organizationId: string,
  ): Promise<ProductDocument> {
    const product = new this.productModel({
      ...createProductDto,
      organization: organizationId,
    });

    const savedProduct = await product.save();

    // Trigger webhook
    try {
      // Convert to plain object
      const productObj = {
        id: savedProduct._id ? savedProduct._id.toString() : '',
        name: savedProduct.name,
        price: savedProduct.price,
        sku: savedProduct.sku,
        organization: organizationId,
      };

      // Trigger webhook event
      await this.webhookService.triggerWebhook(
        WebhookEvent.PRODUCT_CREATED,
        organizationId,
        productObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return savedProduct;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    organizationId: string,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, organization: organizationId },
      updateProductDto,
      { new: true, runValidators: true },
    );

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Trigger webhook for update
    try {
      // Convert to plain object
      const productObj = {
        id: product._id ? product._id.toString() : '',
        name: product.name,
        price: product.price,
        sku: product.sku,
        organization: organizationId,
      };

      // Trigger webhook event for product update
      await this.webhookService.triggerWebhook(
        WebhookEvent.PRODUCT_UPDATED,
        organizationId,
        productObj,
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return product;
  }

  async remove(id: string, organizationId: string): Promise<boolean> {
    const product = await this.productModel.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await product.deleteOne();

    // Trigger webhook
    try {
      // Trigger webhook event for product deletion
      await this.webhookService.triggerWebhook(
        WebhookEvent.PRODUCT_DELETED,
        organizationId,
        { id },
      );
    } catch (error) {
      console.error(
        'Failed to trigger webhook:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }

    return true;
  }
}
