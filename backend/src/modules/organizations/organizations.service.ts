import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.organization.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }
}
