import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './address.dto';
import { throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }
  create(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault || count === 0;
      if (isDefault)
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      return tx.address.create({ data: { ...dto, userId, isDefault } });
    });
  }
  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.requireOwned(userId, id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault)
        await tx.address.updateMany({
          where: { userId, id: { not: id } },
          data: { isDefault: false },
        });
      return tx.address.update({ where: { id }, data: dto });
    });
  }
  async remove(userId: string, id: string) {
    const address = await this.requireOwned(userId, id);
    return this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (next)
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
      return { deleted: true };
    });
  }
  private async requireOwned(userId: string, id: string): Promise<NonNullable<Awaited<ReturnType<typeof this.prisma.address.findFirst>>>> {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throwNotFound(ErrorCode.ADDRESS_NOT_FOUND);
    return address as NonNullable<typeof address>;
  }
}
