import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstructorGuard } from '../instructor/instructor.guard';
import { CreateChallengeDto, UpdateChallengeDto } from './dto/challenge.dto';
import {
  attachmentHeader,
  MAX_FILE_BYTES,
  type UploadedBlob,
} from './file-storage';
import { InstructorChallengesService } from './instructor-challenges.service';

@Controller('instructor/challenges')
@UseGuards(JwtAuthGuard, InstructorGuard)
export class InstructorChallengesController {
  constructor(private readonly challenges: InstructorChallengesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.challenges.list(request.user!.sub);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateChallengeDto,
  ) {
    return this.challenges.create(request.user!.sub, dto);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.challenges.findOne(id, request.user!.sub);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateChallengeDto,
  ) {
    return this.challenges.update(id, request.user!.sub, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.challenges.remove(id, request.user!.sub);
  }

  @Put(':id/file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }),
  )
  uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedBlob | undefined,
  ) {
    return this.challenges.setFile(id, request.user!.sub, file);
  }

  @Delete(':id/file')
  removeFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.challenges.removeFile(id, request.user!.sub);
  }

  @Get(':id/file')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const { stream, name } = await this.challenges.fileFor(
      id,
      request.user!.sub,
    );
    return new StreamableFile(stream, {
      type: 'application/octet-stream',
      disposition: attachmentHeader(name),
    });
  }
}
