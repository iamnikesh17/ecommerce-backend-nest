import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ProductQueryDto {
  @IsString()
  @IsOptional()
  categories?: string;

  @IsOptional()
  @IsInt()
  max_price?: number;

  @IsOptional()
  @IsInt()
  min_price?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number = 2;
}
