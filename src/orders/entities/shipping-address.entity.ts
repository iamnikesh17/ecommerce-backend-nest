import { User } from 'src/users/entities/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class ShippingAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  fullname: string;

  @Column()
  city: string;

  @Column()
  address: string;

  @Column()
  state: string;

  @Column()
  country: string;

  @OneToOne(() => ShippingAddress, (shippingAddress) => shippingAddress.order, {
    onDelete: 'CASCADE',
  })
  order: Order;

  @ManyToOne(() => User, (user) => user.addresses)
  user: User;
}
