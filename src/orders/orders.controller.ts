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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { updateOrderStatusDto } from './dto/update-order-status';
import { AuthorizeRoles } from 'src/utils/decorators/authorize-role.decorator';
import { UserRole } from 'src/users/enums/user-role.enum';
import { AuthorizationGuard } from 'src/utils/guards/Authorization.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
  //   return this.ordersService.update(+id, updateOrderDto);
  // }

  @AuthorizeRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @Put(':id')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: updateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(+id, updateOrderStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
