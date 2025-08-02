const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

// Guardar sesión automáticamente en carpeta "session"
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true, // no abrir navegador
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

/// Constants mensajes.
const welcomeMessage = `
👋✨ *¡Hola, bienvenid@s a* _*Marquesitas Factory*_ ! ✨👋  
¿En qué podemos ayudarte hoy? 🤗👇

─────────────────────────────  
[1] | 🍴 *Menú delicioso*  
[2] | 📍 *Nuestra ubicación*  
[3] | 💵 *Precios irresistibles*  
[4] | 📷 *Galería de imágenes*  
─────────────────────────────

Escribe la opción que quieres y te atenderemos rapidito 🚀💬
`;



client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📷 Escanea este QR solo una vez.');
});

client.on('ready', () => {
    console.log('✅ ¡Bot conectado y listo!');
});

client.on('message', async msg => {
    console.log(`📨 Mensaje de ${msg.from}: ${msg.body}`);

    if (msg.body.toLowerCase() === 'hola') {
        msg.reply(welcomeMessage);
    }

    if (msg.body.toString() === '1') {
        const media = MessageMedia.fromFilePath('./ejemplo.jpg');
        msg.reply(media);
    }
});

client.initialize();
