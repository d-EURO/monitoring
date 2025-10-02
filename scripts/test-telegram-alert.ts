// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

async function testTelegramAlert() {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!botToken || !chatId) {
		console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
		return;
	}

	// Test message mimicking a MintingUpdate alert
	const message = `🚨 *Minting Update*

Severity: *HIGH*
Time: Dec 24 at 14:35:22 UTC

*collateral:* \`1500000000000000000\`
*price:* \`2100000000\`
*principal:* \`20000000000\`

[View on Etherscan →](https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef)`;

	console.log('📤 Sending test alert to Telegram...');
	console.log('Bot Token:', botToken ? '✅ Set' : '❌ Missing');
	console.log('Chat ID:', chatId ? '✅ Set' : '❌ Missing');

	try {
		const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: message,
				parse_mode: 'Markdown',
				disable_web_page_preview: true,
			}),
		});

		if (response.ok) {
			console.log('✅ Test alert sent successfully!');
			console.log('Check your Telegram chat for the test message!');
		} else {
			const error = await response.text();
			console.error('❌ Failed to send:', error);
		}
	} catch (error) {
		console.error('❌ Error:', error);
	}
}

testTelegramAlert();