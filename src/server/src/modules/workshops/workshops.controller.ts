import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../../entities/roles.enum';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { RATE_LIMIT } from '../../config/rate-limit.config';

const pdfFileFilter = (
  _request: unknown,
  file: Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (file.mimetype !== 'application/pdf') {
    return callback(new BadRequestException('Only PDF files are allowed'), false);
  }

  return callback(null, true);
};

@Controller('workshops')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('introDocument', {
      storage: memoryStorage(),
      fileFilter: pdfFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() dto: CreateWorkshopDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.workshopsService.create(dto, file);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('introDocument', {
      storage: memoryStorage(),
      fileFilter: pdfFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkshopDto,
    @UploadedFile() file?: Multer.File,
  ) {
    return this.workshopsService.update(id, dto, file);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Throttle({ default:  RATE_LIMIT.ADMIN })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.workshopsService.remove(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Throttle({ default:  RATE_LIMIT.READ }) // Giới hạn 30 request / 1 phút cho endpoint này
  async listUpcoming(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedPage = Math.max(1, Number(page) || 1);
    const resolvedLimit = Math.min(24, Math.max(1, Number(limit) || 9));

    return this.workshopsService.listUpcoming(resolvedPage, resolvedLimit);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @Throttle({ default:  RATE_LIMIT.READ }) // Giới hạn 30 request / 1 phút cho endpoint này
  async getDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: { user: { id: string } },
  ) {
    return this.workshopsService.getDetail(id, request.user.id);
  }
}
