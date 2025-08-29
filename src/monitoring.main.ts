import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
	const logger = new Logger('Bootstrap');

	const allowedOrigins = process.env.ALLOWED_ORIGINS
		? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
		: ['http://localhost:3000', 'http://localhost:5173', 'https://dev.monitoring.deuro.com', 'https://monitoring.deuro.com'];

	const app = await NestFactory.create(AppModule, {
		cors: {
			origin: allowedOrigins,
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		},
	});

	const config = new DocumentBuilder()
		.setTitle('dEURO Monitoring API')
		.setDescription('Comprehensive monitoring API for the dEURO protocol')
		.setVersion('2.0.0')
		.addTag('Events', 'Historical blockchain events')
		.addTag('States', 'Protocol state snapshots')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('swagger', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
		},
	});

	const port = process.env.PORT || 3001;
	await app.listen(port);

	logger.log(`dEURO Monitoring API running on port ${port}`);
	logger.log(`Swagger documentation available at http://localhost:${port}/swagger`);
	logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
	console.error('Failed to start application:', error);
	process.exit(1);
});
