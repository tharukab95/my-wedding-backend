import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './services/database.service';
import { getTypeOrmConfig } from './config/typeorm.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { FirebaseService } from './common/services/firebase.service';
import { MatrimonialAdsModule } from './modules/matrimonial-ads/matrimonial-ads.module';
import { MatchesModule } from './modules/matches/matches.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UserResolverService } from './services/user-resolver.service';
import { UserResolverMiddleware } from './middleware/user-resolver.middleware';
import { SseModule } from './modules/sse/sse.module';
import {
  User,
  MatrimonialAd,
  AdPhoto,
  AdHoroscope,
  Match,
  InterestRequest,
  ContactExchange,
  MatchRead,
  InterestRequestRead,
  UserAdInteraction,
  LookingForPreferences,
  PricingPlan,
  Payment,
  Notification,
} from './entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getTypeOrmConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      MatrimonialAd,
      AdPhoto,
      AdHoroscope,
      Match,
      InterestRequest,
      ContactExchange,
      MatchRead,
      InterestRequestRead,
      UserAdInteraction,
      LookingForPreferences,
      PricingPlan,
      Payment,
      Notification,
    ]),
    SseModule,
    MatrimonialAdsModule,
    MatchesModule,
    NotificationsModule,
    UsersModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseService,
    FirebaseService,
    UserResolverService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UserResolverMiddleware)
      .exclude('uploads/(.*)')
      .forRoutes('*');
  }
}
