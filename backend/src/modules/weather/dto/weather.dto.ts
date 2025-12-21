import { IsOptional, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class WeatherAlertDto {
  event: string;
  sender: string;
  start: number;
  end: number;
  description: string;
  tags?: string[];
}

export class CultivationImpactAlertDto {
  type: 'TEMPERATURE_EXTREME' | 'HIGH_HUMIDITY' | 'STRONG_WIND' | 'FROST' | 'STORM';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation: string;
  value: number;
  threshold: number;
}

export class ForecastDayDto {
  date: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  icon: string;
  pop: number; // Probability of precipitation
}

export class CurrentWeatherDto {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg?: number;
  clouds?: number;
  visibility?: number;
  description: string;
  icon: string;
  location: string;
  latitude: number;
  longitude: number;
  recordedAt: Date;
  alerts?: WeatherAlertDto[];
  cultivationAlerts?: CultivationImpactAlertDto[];
  forecast?: ForecastDayDto[];
}

export class WeatherHistoryQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class WeatherConfigDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  locationName?: string;
}
