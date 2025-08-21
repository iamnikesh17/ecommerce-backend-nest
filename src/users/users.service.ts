import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { hash, compare } from 'bcrypt';
import { SignInDto } from './dto/sign-in.dto';
import { sign } from 'jsonwebtoken';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          email: createUserDto.email,
        },
      });

      if (user) {
        throw new BadRequestException('user already exists');
      }

      const newUser = this.usersRepository.create({
        ...createUserDto,
        password: await hash(createUserDto.password, 5),
      });

      return this.usersRepository.save(newUser);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new RequestTimeoutException();
    }
  }

  // sign in user
  async signIn(signInDto: SignInDto) {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          email: signInDto.email,
        },
      });
      if (!user) {
        throw new NotFoundException('Invalid Credentials');
      }

      const isPasswordValid = await compare(signInDto.password, user.password);
      if (!isPasswordValid) {
        throw new NotFoundException('Invalid Credentials');
      }

      // generate access token
      const accessToken = sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '1d' },
      );

      return {
        accessToken,
        user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException();
    }
  }

  async findAll() {
    try {
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .select(['user.fullname', 'user.email', 'user.role'])
        .getMany();

      return users;
    } catch (error) {
      throw new RequestTimeoutException(error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async updatePassword(updateUserDto: UpdateUserDto, user: User) {
    try {
      const userFound = await this.usersRepository.findOneBy({ id: user.id });
      if (!user) {
        throw new NotFoundException('User not  found');
      }

      const verifiedPassword = await compare(
        updateUserDto.currentPassword,
        userFound.password,
      );

      if (!verifiedPassword) {
        throw new UnauthorizedException('your current password is invalid');
      }

      const newPassword = await hash(updateUserDto.newPassword, 5);
      userFound.password = newPassword;

      return this.usersRepository.save(userFound);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new RequestTimeoutException();
    }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
