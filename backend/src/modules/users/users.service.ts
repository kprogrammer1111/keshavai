import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export class UpdateProfileDto {
  name?: string;
  avatar?: string;
  theme?: string;
  preferredModel?: string;
}

/**
 * User profile and settings service.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        theme: true,
        preferredModel: true,
        preferredProvider: true,
        emailVerified: true,
        createdAt: true,
        subscription: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        theme: true,
        preferredModel: true,
      },
    });
  }

  async getUsage(userId: string) {
    const usage = await this.prisma.usage.aggregate({
      where: { userId },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        cost: true,
      },
    });

    const recent = await this.prisma.usage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { totals: usage._sum, recent };
  }
}
