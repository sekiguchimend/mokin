import 'reflect-metadata';
import { Container } from 'inversify';
import { SupabaseClient } from '@supabase/supabase-js';

import { TYPES } from './types';
import { logger } from '@/lib/server/utils/logger';

// Config
import { AppConfig } from '@/lib/server/config/app';
import { SupabaseConfig } from '@/lib/server/config/database';
import { SecurityConfig } from '@/lib/server/config/security';

// Database
import {
  initializeSupabase,
  getSupabaseAdminClient,
} from '@/lib/server/database/supabase';

// Repositories
import { CandidateRepository } from '@/lib/server/infrastructure/database/CandidateRepository';
import {
  CompanyAccountRepository,
  CompanyUserRepository,
} from '@/lib/server/infrastructure/database/CompanyUserRepository';

// Services
import { PasswordService } from '@/lib/server/core/services/PasswordService';
import { SessionService } from '@/lib/server/core/services/SessionService';
import { UserRegistrationService } from '@/lib/server/core/services/UserRegistrationService';
import { ValidationService } from '@/lib/server/core/services/ValidationService';

// Controllers
import { AuthController } from '@/lib/server/controllers/AuthController';

// Interfaces
import {
  IPasswordService,
  IUserRegistrationService,
} from '@/lib/server/core/interfaces/IAuthService';
import type { ISessionService } from '@/lib/server/core/services/SessionService';
import { ICandidateRepository } from '@/lib/server/core/interfaces/IDomainRepository';

// DIコンテナ設定 (SOLID原則準拠)
export const container = new Container({
  defaultScope: 'Singleton',
  autoBindInjectable: true,
});

// ビルド時とランタイムの区別
const isRuntime =
  typeof window !== 'undefined' ||
  (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PHASE);

// ビルド時は初期化をスキップ
if (process.env.NEXT_PHASE === 'phase-production-build') {
  logger.info('🔧 Skipping DI Container initialization during build phase');
} else {
  try {
    // Supabase初期化を先に実行（ランタイムのみ）
    if (isRuntime) {
      // Supabaseクライアントの初期化
      initializeSupabase();
      logger.info('✅ Supabase client initialized');
    }

    // === 設定バインディング ===
    container.bind<AppConfig>(TYPES.Config).to(AppConfig);
    container.bind<SupabaseConfig>(TYPES.DatabaseClient).to(SupabaseConfig);
    container.bind<SecurityConfig>(TYPES.Security).to(SecurityConfig);

    // === データベースクライアント ===
    if (isRuntime) {
      container
        .bind<SupabaseClient>(TYPES.SupabaseClient)
        .toConstantValue(getSupabaseAdminClient());
    } else {
      // ビルド時用のダミークライアント
      container
        .bind<SupabaseClient>(TYPES.SupabaseClient)
        .toConstantValue({} as SupabaseClient);
    }

    // === リポジトリバインディング ===
    container
      .bind<ICandidateRepository>(TYPES.CandidateRepository)
      .to(CandidateRepository);

    container
      .bind<CompanyUserRepository>(TYPES.CompanyRepository)
      .to(CompanyUserRepository);

    container
      .bind<CompanyAccountRepository>(TYPES.CompanyAccountRepository)
      .to(CompanyAccountRepository);

    // === サービスバインディング ===
    container.bind<IPasswordService>(TYPES.PasswordService).to(PasswordService);

    container.bind<ISessionService>(TYPES.SessionService).to(SessionService);

    container
      .bind<IUserRegistrationService>(TYPES.UserRegistrationService)
      .to(UserRegistrationService);

    container
      .bind<ValidationService>(TYPES.ValidationService)
      .to(ValidationService);

    // === コントローラーバインディング ===
    container.bind<AuthController>(TYPES.AuthController).to(AuthController);

    logger.info('✅ DI Container initialized successfully');
    logger.debug('📦 Registered bindings:', {
      configs: ['AppConfig', 'SupabaseConfig', 'SecurityConfig'],
      repositories: [
        'CandidateRepository',
        'CompanyUserRepository',
        'CompanyAccountRepository',
      ],
      services: [
        'PasswordService',
        'UserRegistrationService',
        'ValidationService',
      ],
      controllers: ['AuthController'],
    });
  } catch (error) {
    logger.error('❌ Failed to initialize DI Container:', error);
    // ビルド時はエラーを無視
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE) {
      logger.warn('⚠️ DI Container initialization skipped during build phase');
    } else {
      throw new Error(
        `DI Container initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
