import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  orderItems: OrderItem[];

  @OneToOne(() => ShippingAddress, (shippingAddress) => shippingAddress.order, {
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  shippingAddress: ShippingAddress;

  @Column({
    default: false,
  })
  isDelivered: boolean;

  @Column({
    nullable: true,
  })
  deliveredAt?: Date;

  @Column({
    nullable: true,
  })
  totalPrice?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  UpdatedAt: Date;
}
