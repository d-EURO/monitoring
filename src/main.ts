import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, { cors: true });

  const config = new DocumentBuilder()
    .setTitle('dEURO Monitoring API')
    .setDescription('Comprehensive monitoring API for the dEURO protocol with historical data persistence')
    .setVersion('2.0.0')
    .addTag('Events', 'Historical blockchain events')
    .addTag('States', 'Protocol state snapshots')
    .addTag('Analytics', 'Aggregated protocol metrics')
    .addTag('Health', 'System health and monitoring status')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  logger.log(`dEURO Monitoring API running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});