import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Put,
  Query,
  ParseIntPipe,
  Optional,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthorizeRoles } from 'src/utils/decorators/authorize-role.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthorizationGuard } from 'src/utils/guards/Authorization.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductTransformInterceptor } from 'src/utils/interceptors/transform-products.interceptor';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @AuthorizeRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      // File filter for images only
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      // Size limit per file (5MB)
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10, // Max 10 files
      },
    }),
  )
  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB per file
          new FileTypeValidator({ fileType: /\/(jpg|jpeg|png|gif|webp)$/ }),
        ],
        fileIsRequired: false, // Images are optional
      }),
    )
    images?: Express.Multer.File[],
  ) {
    return this.productsService.create(createProductDto, user, images);
  }

  @UseInterceptors(ProductTransformInterceptor)
  @Get()
  findAll(@Query() productQueryDto: ProductQueryDto) {
    return this.productsService.findAll(productQueryDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @AuthorizeRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
      // Size limit per file (5MB)
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 10, // Max 10 files
      },
    }),
  )
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB per file
          new FileTypeValidator({ fileType: /\/(jpg|jpeg|png|gif|webp)$/ }),
        ],
        fileIsRequired: false, // Images are optional
      }),
    )
    newImages?: Express.Multer.File[],
  ) {
    return this.productsService.update(+id, updateProductDto, newImages);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
