import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CategoriesService } from 'src/categories/categories.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { CloudinaryService } from 'src/common/services/cloudinary.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly categoriesService: CategoriesService,

    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async create(
    createProductDto: CreateProductDto,
    user: User,
    images?: Express.Multer.File[],
  ) {
    let uploadedImageUrls: string[] = [];

    try {
      const product = await this.productRepository.findOne({
        where: {
          title: createProductDto.title,
        },
      });

      if (product) {
        throw new BadRequestException(
          `product ${product.title} already exists`,
        );
      }

      const category = await this.categoriesService.findOne(
        createProductDto.categoryId,
      );
      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Upload images to Cloudinary if provided
      if (images && images.length > 0) {
        uploadedImageUrls = await this.cloudinaryService.uploadMultipleImages(
          images,
          {
            folder: 'products',
            maxFiles: 10,
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            generateThumbnails: true,
            quality: 'auto:good',
            width: 1200,
            height: 1200,
            cropMode: 'limit',
          },
        );
      }

      let newProduct = this.productRepository.create({
        ...createProductDto,
        images: uploadedImageUrls,
        category,
      });

      newProduct.seller = user;

      return await this.productRepository.save(newProduct);
    } catch (error) {
      // Cleanup uploaded images if product creation fails
      if (uploadedImageUrls.length > 0) {
        await this.cloudinaryService.deleteMultipleImages(
          uploadedImageUrls,
          'products',
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to create product: ${error.message}`,
      );
    }
  }

  async findAll(productQueryDto: ProductQueryDto) {
    try {
      const { page, limit, search, categories, max_price, min_price } =
        productQueryDto;
      let qb = this.productRepository.createQueryBuilder('product');

      qb.leftJoinAndSelect('product.category', 'category')
        .leftJoin('product.orderItems', 'orderItem')
        .addSelect('COALESCE(SUM(orderItem.quantity), 0)', 'totalSold')
        .groupBy('product.id')
        .addGroupBy('category.id');

      if (categories) {
        let categoryIds = categories.split(',').map((catId) => Number(catId));
        qb.andWhere('product.categoryId IN (:...categoryIds)', {
          categoryIds,
        });
      }

      if (search) {
        qb.andWhere(
          'product.title LIKE :search OR product.description LIKE :search',
          {
            search: `%${search}%`,
          },
        );
      }
      if (max_price) {
        qb.andWhere('product.price <= :max_price', { max_price });
      }
      if (min_price) {
        qb.andWhere('product.price >= :min_price', { min_price });
      }
      qb.orderBy('product.createdAt', 'DESC');

      // get  total count of products
      const totalProducts = await qb.getCount();

      // pagination logic
      const skip = (page - 1) * limit;
      qb.skip(skip).take(limit);

      const products = await qb.getRawMany();
      return {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        result: products.length,
        products,
      };
    } catch (error) {
      throw new Error(error);
    }
  }

  async findOne(id: number) {
    try {
      const product = await this.productRepository.findOneBy({ id });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    newImages?: Express.Multer.File[],
  ): Promise<Product> {
    let oldImageUrls: string[] = [];
    let uploadedImageUrls: string[] = [];
    try {
      const product = await this.productRepository.findOne({
        where: {
          id: id,
        },
        relations: {
          seller: true,
          category: true,
        },
      });

      if (!product) {
        throw new NotFoundException('product not found');
      }

      // old images xa vane cleaup garne
      oldImageUrls = product.images || [];

      // Upload new images to Cloudinary if provided
      if (newImages && newImages.length > 0) {
        uploadedImageUrls = await this.cloudinaryService.uploadMultipleImages(
          newImages,
          {
            folder: 'products',
            maxFiles: 10,
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
            generateThumbnails: true,
          },
        );
      }

      if (updateProductDto.categoryId) {
        const category = await this.categoriesService.findOne(
          updateProductDto.categoryId,
        );
        if (!category) {
          throw new BadRequestException('Invalid category');
        }
        product.category = category;
      }

      const updatedProduct = await this.productRepository.save({
        ...product,
        ...updateProductDto,
        images:
          uploadedImageUrls.length > 0 ? uploadedImageUrls : product.images,
      });

      if (uploadedImageUrls.length > 0 && oldImageUrls.length > 0) {
        await this.cloudinaryService.deleteMultipleImages(
          oldImageUrls,
          'products',
        );
      }

      return updatedProduct;

      // product.title = updateProductDto.title || product.title;
      // product.price = updateProductDto.price || product.price;
      // product.stock = updateProductDto.stock || product.stock;
      // product.description = updateProductDto.description || product.description;
      // product.images = updateProductDto.images || product.images;

      // delete product.seller.password;

      // return this.productRepository.save(product);
    } catch (error) {
      // Cleanup newly uploaded images if update fails
      if (uploadedImageUrls.length > 0) {
        await this.cloudinaryService.deleteMultipleImages(
          uploadedImageUrls,
          'products',
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to update product: ${error.message}`,
      );
    }
  }

  async remove(id: number) {
    try {
      const product = await this.productRepository.findOne({
        where: {
          id: id,
        },
      });
      if (!product) {
        throw new BadRequestException('Product not found');
      }

      await this.productRepository.remove(product);
      return {
        message: `product deleted successfully`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new InternalServerErrorException(error.message);
      }
    }
  }
}
