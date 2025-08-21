import { IsInt, IsNumber, IsString, Min } from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  purchaseAt: number;

  @IsString()
  productName: string;
}
