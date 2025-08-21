import { IsString } from 'class-validator';

export class shippingAddressDto {
  @IsString()
  fullname: string;

  @IsString()
  city: string;

  @IsString()
  address: string;

  @IsString()
  state: string;

  @IsString()
  country: string;
}
