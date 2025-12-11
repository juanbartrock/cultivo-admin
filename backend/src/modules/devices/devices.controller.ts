import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DevicesService, ScannedDevice } from './devices.service';
import { SensorHistoryService } from './sensor-history.service';
import { DeviceStatus } from './iot-gateway.service';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  AssignDeviceDto,
  ControlDeviceDto,
} from './dto/device.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly sensorHistoryService: SensorHistoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los dispositivos registrados' })
  @ApiResponse({ status: 200, description: 'Lista de dispositivos' })
  async findAll() {
    return this.devicesService.findAll();
  }

  @Get('scan')
  @ApiOperation({
    summary: 'Escanear dispositivos de todos los microservicios IoT',
    description:
      'Consulta Sonoff, Tuya y Tapo. Devuelve dispositivos con estado de asignación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de dispositivos escaneados con estado de asignación',
  })
  async scan(): Promise<ScannedDevice[]> {
    return this.devicesService.scanDevices();
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificar salud de los microservicios IoT' })
  @ApiResponse({
    status: 200,
    description: 'Estado de salud de cada conector',
  })
  async getConnectorsHealth() {
    return this.devicesService.getConnectorsHealth();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un dispositivo por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del dispositivo' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.findById(id);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Obtener estado actual del dispositivo',
    description: 'Consulta el microservicio correspondiente para obtener el estado en tiempo real',
  })
  @ApiResponse({ status: 200, description: 'Estado del dispositivo' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async getStatus(@Param('id', ParseUUIDPipe) id: string): Promise<{ device: unknown; status: DeviceStatus }> {
    return this.devicesService.getDeviceStatus(id);
  }

  @Get(':id/stream')
  @ApiOperation({
    summary: 'Obtener información del stream de una cámara',
    description: 'Solo disponible para cámaras TAPO',
  })
  @ApiResponse({ status: 200, description: 'Información del stream' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado o no es una cámara' })
  async getStream(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.getCameraStreamInfo(id);
  }

  @Post(':id/snapshot')
  @ApiOperation({
    summary: 'Capturar un snapshot de la cámara',
    description: 'Solo disponible para cámaras TAPO',
  })
  @ApiResponse({ status: 200, description: 'Snapshot capturado' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado o no es una cámara' })
  async captureSnapshot(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.captureSnapshot(id);
  }

  @Get(':id/snapshots')
  @ApiOperation({
    summary: 'Listar snapshots disponibles de una cámara',
    description: 'Solo disponible para cámaras TAPO',
  })
  @ApiResponse({ status: 200, description: 'Lista de snapshots' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado o no es una cámara' })
  async listSnapshots(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.listSnapshots(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo dispositivo' })
  @ApiResponse({ status: 201, description: 'Dispositivo creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Dispositivo ya existe' })
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.devicesService.create(createDeviceDto);
  }

  @Post('assign')
  @ApiOperation({
    summary: 'Asignar un dispositivo a una sección',
    description: 'Si el dispositivo no existe en la DB, lo crea. Si existe, actualiza la asignación.',
  })
  @ApiResponse({ status: 201, description: 'Dispositivo asignado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sección no encontrada' })
  async assign(@Body() assignDeviceDto: AssignDeviceDto) {
    return this.devicesService.assignDevice(assignDeviceDto);
  }

  @Post(':id/control')
  @ApiOperation({
    summary: 'Controlar un dispositivo (encender/apagar)',
    description: 'Envía comando al microservicio correspondiente',
  })
  @ApiResponse({ status: 200, description: 'Comando ejecutado' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async control(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() controlDto: ControlDeviceDto,
  ) {
    return this.devicesService.controlDevice(id, controlDto.action);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un dispositivo' })
  @ApiResponse({ status: 200, description: 'Dispositivo actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un dispositivo' })
  @ApiResponse({ status: 200, description: 'Dispositivo eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Dispositivo no encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.delete(id);
  }

  // ============================================
  // HISTORIAL DE SENSORES
  // ============================================

  @Post('history/record')
  @ApiOperation({
    summary: 'Forzar registro de lecturas de sensores',
    description: 'Dispara manualmente el registro de lecturas para todos los dispositivos con recordHistory=true',
  })
  @ApiResponse({ status: 200, description: 'Registro ejecutado' })
  async forceRecordSensorReadings() {
    await this.sensorHistoryService.recordSensorReadings();
    return { success: true, message: 'Sensor readings recorded' };
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Obtener historial de lecturas de un sensor',
    description: 'Retorna lecturas de temperatura/humedad. Por defecto las últimas 6 horas.',
  })
  @ApiResponse({ status: 200, description: 'Historial de lecturas' })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hours') hours?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Si se proporcionan from y to, usar rango de fechas
    if (from && to) {
      return this.sensorHistoryService.getHistoryByRange(
        id,
        new Date(from),
        new Date(to),
      );
    }
    // Si no, usar horas (default 6)
    return this.sensorHistoryService.getHistory(
      id,
      hours ? parseInt(hours, 10) : 6,
    );
  }

  @Get(':id/history/latest')
  @ApiOperation({
    summary: 'Obtener las últimas lecturas de un sensor',
  })
  @ApiResponse({ status: 200, description: 'Últimas lecturas' })
  async getLatestReadings(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.sensorHistoryService.getLatestReadings(
      id,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(':id/history/stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del historial de un sensor',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas del sensor' })
  async getHistoryStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hours') hours?: string,
  ) {
    return this.sensorHistoryService.getStats(
      id,
      hours ? parseInt(hours, 10) : 24,
    );
  }
}
