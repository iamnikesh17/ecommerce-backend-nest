import { IsArray, ValidateNested } from 'class-validator';
import { OrderItemDto } from './order-item.dto';
import { Type } from 'class-transformer';
import { shippingAddressDto } from './shipping-address.dto';

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @ValidateNested({ each: true })
  @Type(() => shippingAddressDto)
  shippingAddress: shippingAddressDto;
}
