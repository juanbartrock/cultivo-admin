import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  UserResponseDto,
  SubscriptionLimitsDto,
} from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // ENDPOINTS PARA ADMIN
  // ============================================

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos los usuarios (solo admin)' })
  @ApiQuery({ name: 'stats', required: false, type: Boolean, description: 'Incluir estadísticas' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios', type: [UserResponseDto] })
  async findAll(@Query('stats') stats?: string) {
    const includeStats = stats === 'true';
    return this.usersService.findAll(includeStats);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener usuario por ID (solo admin)' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findById(@Param('id') id: string, @Query('stats') stats?: string) {
    const includeStats = stats === 'true';
    return this.usersService.findById(id, includeStats);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario (solo admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email ya existe' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 403, description: 'No permitido' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async deactivate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.deactivate(id, currentUser);
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reactivar usuario (solo admin)' })
  @ApiResponse({ status: 200, description: 'Usuario reactivado' })
  async reactivate(@Param('id') id: string) {
    return this.usersService.reactivate(id);
  }

  // ============================================
  // ENDPOINTS PARA USUARIO ACTUAL
  // ============================================

  @Get('me/profile')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario', type: UserResponseDto })
  async getMyProfile(@CurrentUser() user: User) {
    return this.usersService.findById(user.id, true);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Actualizar perfil del usuario actual' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado', type: UserResponseDto })
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get('me/subscription')
  @ApiOperation({ summary: 'Obtener límites de suscripción del usuario actual' })
  @ApiResponse({ status: 200, description: 'Límites de suscripción', type: SubscriptionLimitsDto })
  async getMySubscription(@CurrentUser() user: User) {
    const limits = this.usersService.getSubscriptionLimits(user.subscriptionTier);
    return {
      tier: user.subscriptionTier,
      limits,
    };
  }

  @Get('me/can-create/:resource')
  @ApiOperation({ summary: 'Verificar si puede crear un recurso según suscripción' })
  @ApiQuery({ name: 'parentId', required: false, description: 'ID del recurso padre (ej: roomId para secciones)' })
  async canCreate(
    @CurrentUser() user: User,
    @Param('resource') resource: 'room' | 'section' | 'automation' | 'device',
    @Query('parentId') parentId?: string,
  ) {
    return this.usersService.canCreateResource(user.id, resource, parentId);
  }
}




