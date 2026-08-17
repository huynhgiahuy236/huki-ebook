import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateProfile(userId: string, data: Partial<User>): Promise<User> {
    await this.userRepository.update(userId, data);
    return this.findById(userId);
  }

  async getPublicProfile(userId: string) {
    const user = await this.findById(userId);
    return {
      id: user.id,
      fullName: user.fullName,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}
