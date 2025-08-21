import { IsBoolean, IsDateString } from 'class-validator';

export class updateOrderStatusDto {
  @IsBoolean()
  isDelivered: boolean;

  @IsDateString()
  deliveredAt: Date;
}
