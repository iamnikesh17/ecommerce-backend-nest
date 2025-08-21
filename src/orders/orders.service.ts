import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { User } from 'src/users/entities/user.entity';
import { ProductsService } from 'src/products/products.service';
import { OrderItem } from './entities/order-item.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { ShippingAddress } from './entities/shipping-address.entity';
import { Product } from 'src/products/entities/product.entity';
import { privateDecrypt } from 'crypto';
import { updateOrderStatusDto } from './dto/update-order-status';

@Injectable()
export class OrdersService {
  constructor(
    private readonly productsService: ProductsService,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(ShippingAddress)
    private readonly shippingAddressRepository: Repository<ShippingAddress>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}
  async create(createOrderDto: CreateOrderDto, user: User) {
    const { orderItems, shippingAddress } = createOrderDto;
    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Order should have at least one item');
    }

    let totalPrice = 0;
    let orderItemsData: OrderItem[] = [];

    try {
      for (const item of orderItems) {
        const product = await this.productsService.findOne(item.productId);
        if (!product) {
          throw new BadRequestException(`${item.productName} is not available`);
        }

        // check if the product.stock is greater than item.quanity
        if (product.stock <= item.quantity) {
          throw new BadRequestException('Sorry, the product is out of stock');
        }

        const orderItem = this.orderItemRepository.create({
          product: product,
          productName: item.productName,
          purchaseAt: item.purchaseAt,
          quantity: item.quantity,
        });

        totalPrice += Number(item.quantity) * Number(product.price);
        product.stock -= item.quantity;

        await this.productRepository.save(product);

        orderItemsData.push(orderItem);
      }

      const newOrder = this.orderRepository.create({
        orderItems: orderItemsData,
        shippingAddress: this.shippingAddressRepository.create({
          ...shippingAddress,
          user: user,
        }),
        user: user,
        totalPrice,
      });

      return await this.orderRepository.save(newOrder);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  findAll() {
    return `This action returns all orders`;
  }

  async findOne(id: number) {
    try {
      const order = await this.orderRepository.findOne({
        where: {
          id: id,
        },
        relations: {
          orderItems: {
            product: true,
          },
        },
      });

      return order;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateOrderStatus(
    id: number,
    updateOrderStatusDto: updateOrderStatusDto,
  ) {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: id },
      });
      if (!order) {
        throw new BadRequestException('order not found');
      }

      if (updateOrderStatusDto.deliveredAt) {
        throw new BadRequestException('order has been delivered already');
      }

      order.isDelivered = updateOrderStatusDto.isDelivered;
      order.deliveredAt = updateOrderStatusDto.deliveredAt;

      await this.orderRepository.save(order);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
