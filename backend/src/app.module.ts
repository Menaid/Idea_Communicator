import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
// import redisConfig from './config/redis.config'; // TODO: Implement Redis cache for future use
// import storageConfig from './config/storage.config'; // TODO: Implement MinIO storage for future use
import jwtConfig from './config/jwt.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { MessagesModule } from './messages/messages.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CallsModule } from './calls/calls.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig], // redisConfig and storageConfig available for future use
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('database.url'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production', // Only in dev
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per minute
    }]),

    // Feature modules
    CommonModule,
    AuthModule,
    UsersModule,
    GroupsModule,        // Phase 2
    MessagesModule,      // Phase 2
    ChatModule,          // Phase 2 - WebSocket Gateway
    NotificationsModule, // Phase 2 - Real-time notifications
    CallsModule,         // Phase 3
    // RecordingsModule,   // Phase 4
    // AiModule,           // Phase 5
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
