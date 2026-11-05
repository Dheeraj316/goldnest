import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveBranches() {
    const branches = await this.prisma.branch.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pinCode: true,
        phone: true,
        latitude: true,
        longitude: true,
        workingHours: true,
      },
    });
    return branches.map((b) => ({
      code: b.code,
      name: b.name,
      address: [b.addressLine1, b.addressLine2, `${b.city}, ${b.state} ${b.pinCode}`].filter(Boolean).join(', '),
      city: b.city,
      state: b.state,
      phone: b.phone,
      latitude: b.latitude,
      longitude: b.longitude,
      workingHours: b.workingHours,
    }));
  }

  async createEnquiry(dto: CreateEnquiryDto) {
    const enquiry = await this.prisma.websiteEnquiry.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        sourcePage: dto.sourcePage,
      },
    });
    return { id: enquiry.id, createdAt: enquiry.createdAt };
  }

  async listEnquiries(status?: string) {
    return this.prisma.websiteEnquiry.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEnquiryStatus(id: string, status: string, actor: JwtPayloadUser) {
    const enquiry = await this.prisma.websiteEnquiry.findUnique({ where: { id } });
    if (!enquiry) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return this.prisma.websiteEnquiry.update({
      where: { id },
      data: {
        status,
        contactedBy: status === 'NEW' ? null : (actor.employeeId ?? enquiry.contactedBy),
        contactedAt: status === 'NEW' ? null : new Date(),
      },
    });
  }
}
