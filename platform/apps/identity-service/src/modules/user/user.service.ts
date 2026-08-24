import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
    });
  }

  async updateProfile(
    userId: string,
    data: Pick<Prisma.UserUpdateInput, 'fullName' | 'phone' | 'avatar'>,
  ): Promise<User> {
    await this.findById(userId);
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async getPublicProfile(userId: string) {
    const user = await this.findById(userId);
    return { id: user.id, fullName: user.fullName, avatar: user.avatar, createdAt: user.createdAt };
  }
}
