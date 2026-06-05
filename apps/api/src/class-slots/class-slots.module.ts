import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassExceptionsController } from './class-exceptions.controller';
import { ClassSlotsController } from './class-slots.controller';
import { ClassSlotsService } from './class-slots.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClassSlotsController, ClassExceptionsController],
  providers: [ClassSlotsService],
})
export class ClassSlotsModule {}
