import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AttendanceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BatchAttendanceDto } from './dto/batch-attendance.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(month?: string) {
    const { monthStart, nextMonthStart } = this.resolveMonthRange(month);

    return this.prisma.attendance.findMany({
      where: {
        attendanceDate: {
          gte: monthStart,
          lt: nextMonthStart
        }
      },
      orderBy: [{ attendanceDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        attendanceDate: true,
        id: true,
        studentId: true,
        type: true
      }
    });
  }

  async create(dto: CreateAttendanceDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: {
        id: true,
        isActive: true
      }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    if (!student.isActive) {
      throw new BadRequestException(
        'Não é possível marcar presença para um aluno inativo.'
      );
    }

    const attendanceDate = this.parseDateOnly(dto.attendanceDate);
    const type = dto.type ?? 'TENNIS';

    return this.prisma.attendance.upsert({
      where: {
        studentId_attendanceDate_type: {
          attendanceDate,
          studentId: dto.studentId,
          type
        }
      },
      create: {
        attendanceDate,
        studentId: dto.studentId,
        type
      },
      update: {},
      select: {
        attendanceDate: true,
        id: true,
        studentId: true,
        type: true
      }
    });
  }

  async batchUpsert(dto: BatchAttendanceDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, isActive: true }
    });

    if (!student) {
      throw new NotFoundException('Aluno não encontrado.');
    }

    if (!student.isActive) {
      throw new BadRequestException(
        'Não é possível marcar presença para um aluno inativo.'
      );
    }

    const attendanceDate = this.parseDateOnly(dto.attendanceDate);

    // Apaga presenças cujo tipo não está no array recebido
    if (dto.types.length > 0) {
      await this.prisma.attendance.deleteMany({
        where: {
          studentId: dto.studentId,
          attendanceDate,
          type: { notIn: dto.types }
        }
      });
    } else {
      // Array vazio — remove todas as presenças do dia
      await this.prisma.attendance.deleteMany({
        where: {
          studentId: dto.studentId,
          attendanceDate
        }
      });
    }

    // Se o array está vazio, já apagou tudo — retorna conjunto vazio
    if (dto.types.length === 0) {
      return [];
    }

    // Faz upsert para cada tipo no array
    return this.prisma.$transaction(
      dto.types.map((type) =>
        this.prisma.attendance.upsert({
          where: {
            studentId_attendanceDate_type: {
              studentId: dto.studentId,
              attendanceDate,
              type
            }
          },
          create: {
            studentId: dto.studentId,
            attendanceDate,
            type
          },
          update: {},
          select: {
            attendanceDate: true,
            id: true,
            studentId: true,
            type: true
          }
        })
      )
    );
  }

  async remove(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!attendance) {
      throw new NotFoundException('Presença não encontrada.');
    }

    await this.prisma.attendance.delete({
      where: { id }
    });
  }

  private resolveMonthRange(month?: string) {
    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException(
        'Mês inválido. Use o formato YYYY-MM.'
      );
    }

    const now = new Date();
    const [year, monthIndex] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1];

    const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, monthIndex, 1));

    return { monthStart, nextMonthStart };
  }

  private parseDateOnly(rawValue: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
      throw new BadRequestException(
        'Data inválida. Use o formato YYYY-MM-DD.'
      );
    }

    const [year, month, day] = rawValue.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}
