const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const userStates = {};

// Guardar sesión automáticamente en carpeta "session"
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: {
        headless: true, // no abrir navegador
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

/// Imagenes constantes.
const menuPath = path.join(__dirname, 'img', 'menu', 'menu.jpg');
const menuPDFPath = path.join(__dirname, 'docs', 'menu.pdf');
const hoariosPDFPath = path.join(__dirname, 'docs', 'horarios.pdf');


/// Constants mensajes.
const welcomeMessage = `
👋✨ *¡Hola, bienvenid@s a* _*Marquesitas Factory*_ ! ✨👋  
¿En qué podemos ayudarte hoy? 🤗👇

────────────────
[1] | 📩 *Hacer pedido*  
[2] | 🍴 *Menú delicioso*  
[3] | 📍 *Nuestra ubicación*  
[4] | 💵 *Precios irresistibles*  
[5] | 📷 *Galería de imágenes*  
[6] | ❓ *Recomendaciones*
[7] | 📆 *Horario de atención*
────────────────

Escribe la opción que quieres y te atenderemos rapidito 🚀💬
`;

const pedidoMessage = `🍽️ Pedido:

📌 Nombre: Juan

🟢 Cantidad: 2  
🟡 Marquesita 1: Nutella + Fresa  
🟡 Marquesita 2: Mermelada de fresa + Plátano + Queso de bola
────────────────
Notas: Puede especificar alguna nota adicional aquí.
────────────────
*¡Gracias por tu pedido!*
`;
////////////////////////////////////////////////////////////////////////////////////////////////////
// Funciones de eventos del cliente de WhatsApp
function guardarPedido(userId, pedidoTexto) {
    const fecha = new Date().toLocaleString(); // Fecha y hora legible
    const contenido = `
Usuario: ${userId}
---
Fecha y hora: ${fecha}
---
Pedido:
${pedidoTexto}
----------------------------
`;

    const archivo = path.join(__dirname, 'pedidos.txt');

    // Escribir al archivo (agregando al final)
    fs.appendFile(archivo, contenido, err => {
        if (err) {
            console.error('Error al guardar el pedido:', err);
        } else {
            console.log(`Pedido guardado para usuario ${userId}`);
        }
    });
}



////////////////////////////////////////////////////////////////////////////////////////////////////
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📷 Escanea este QR solo una vez.');
});

client.on('ready', () => {
    console.log('✅ ¡Bot conectado y listo!');
});

client.on('message', async msg => {
    console.log(`📨 Mensaje de ${msg.from}: ${msg.body}`);

    // Si el usuario escribe "hola" o "0", enviamos el mensaje de bienvenida
    if (msg.body.toLowerCase() === 'hola' || msg.body.toString() === '0') {
        msg.reply(welcomeMessage);
    }

    // Si el usuario escribe "menu" o "0", enviamos el mensaje de bienvenida
    if (msg.body.toString() === '1') {
        userStates[msg.from] = { step: 'awaiting_order' };
        await client.sendMessage(msg.from, '📩 *¡Perfecto!* Para hacer tu pedido, por favor envíalo con el siguiente formato: (no tiene que ser exactamente igual)');
        await client.sendMessage(msg.from, pedidoMessage); // Asegúrate que `pedidoMessage` esté definido
        await client.sendMessage(msg.from, '*Cuando termines tu pedido, escribe* "confirmar" ✅ o "cancelar" ❌');
        return;
    }

    // Si el usuario está haciendo un pedido
    if (userStates[msg.from]?.step === 'awaiting_order') {
        if (msg.body.toLowerCase() === 'confirmar') {

            const pedidoUsuario = userStates[msg.from].pedido || 'No especificado';
            guardarPedido(msg.from, pedidoUsuario);

            await client.sendMessage(msg.from, '🧾 *¡Tu pedido ha sido confirmado!* En breve te contactaremos. 🙌');
            await client.sendMessage(msg.from, welcomeMessage);
            delete userStates[msg.from];
        } else if (msg.body.toLowerCase() === 'cancelar' || msg.body.toString() === '0') {
            await client.sendMessage(msg.from, '❌ *Tu pedido ha sido cancelado.*');
            await client.sendMessage(msg.from, welcomeMessage);
            delete userStates[msg.from];
        } else {
            // Guardamos el texto del pedido para luego (opcional)
            userStates[msg.from].pedido = msg.body.toString().trim();
            await client.sendMessage(msg.from, '📝 Pedido recibido. Escribe *"confirmar"* para enviarlo o *"cancelar"* para eliminarlo.');
        }
        return;
    }

    // Si el usuario solicita el menú
    // Aquí puedes agregar la lógica para enviar el menú
    if (msg.body.toString() === '2') {
        // if (fs.existsSync(menuPath)) {
        //     const mimeType = mime.lookup(menuPath) || 'image/jpg';
        //     const buffer = fs.readFileSync(menuPath);
        //     const base64 = buffer.toString('base64');
        //     const mediaMenu = new MessageMedia(mimeType, base64, 'menu.jpg');

        await msg.reply('🍴 *¡Aquí tienes nuestro delicioso menú!*');
        // await client.sendMessage(msg.from, mediaMenu);
        if (fs.existsSync(menuPDFPath)) {
            const mimeType = mime.lookup(menuPDFPath) || 'application/pdf';
            const base64 = fs.readFileSync(menuPDFPath).toString('base64');
            const mediaPDF = new MessageMedia(mimeType, base64, 'menu.pdf');

        // await client.sendMessage(msg.from,'📄 *Aquí tienes nuestro menú en PDF!*');
        await client.sendMessage(msg.from, mediaPDF);
        } else {
            await msg.reply('❌ No pudimos encontrar el menú en PDF en este momento.');
        }
        await client.sendMessage(
            msg.from,
            `\n🍽️ *¿List@ para ordenar?*\nEscribe:\n[1] 🛒 *Hacer un pedido*\n[0] 📋 *Ver más opciones*\n¡Estamos aquí para ayudarte! 🤗`
        );
    }

    // Si el usuario solicita la ubicación
    // Aquí puedes agregar la lógica para enviar la ubicación
    if (msg.body.toString() === '3') {
        await client.sendMessage(msg.from, 
            '📍 *Nuestra ubicación es:*\n\n' +
            '*Marquesitas Factory*\n' +
            '📌 Blvd Benito Juárez, Playas de Rosarito\n' +
            '🔍 Cerca del Restaurante El Nido\n\n' +
            '*¡Google Maps!*\n\n🌐 https://maps.app.goo.gl/55z1CpKXMQLG9pYS6\n\n' +
            '🗺️ *¡Ven a visitarnos!*');
        await client.sendMessage(msg.from, '*Desea regresar al menú principal?*\n [0] 📋 *Ver más opciones*');
    }

    // Si el usuario solicita información sobre precios
    // Aquí puedes agregar la lógica para enviar información sobre precios
    if (msg.body.toString() === '4') {
        msg.reply('💵 *Nuestros precios son muy accesibles:* \n\n🟡 El costo de nuestra marquesita es de 80$ con 1 a 2 ingredientes, a elegir del menú.\nCosto de 10$ por ingrediente extra que se agregue.\n\n*¡Ven y disfruta de nuestras deliciosas marquesitas!*');
    }

    // Si el usuario solicita ver imágenes de la galería
    if (msg.body.toString() === '5')  
    {
        const imageDir = path.join(__dirname, 'img');
        const files = fs.readdirSync(imageDir).filter(file => /\.(jpg|jpeg|png)$/i.test(file));

        if (files.length === 0) {
            msg.reply('📂 No hay imágenes en la galería.');
            return;
        }

        for (const file of files) {
            const filePath = path.join(imageDir, file);
            const mimeType = mime.lookup(filePath);
            const media = new MessageMedia(mimeType, fs.readFileSync(filePath, { encoding: 'base64' }).toString('base64'), file);
            await client.sendMessage(msg.from, media);
        }
    }

    // Si el usuario solicita recomendaciones
    // Aquí puedes agregar la lógica para enviar recomendaciones
    if (msg.body.toString() === '6') {
        await msg.reply('❓ *Recomendaciones:* \n\n👉 *Prueba nuestras marquesitas mas pedidas*');
        await client.sendMessage(msg.from, `🟡 Marquesita 1: Nutella + Fresa\n
🟡 Nutella + Philadelphia + Fresa + Queso de bola\n
🟡 Cajeta + Fresa + Queso de bola\n
🟡 Nutella + Philadelphia + Fresa + Plátano + Queso de bola\n
🟡 Nutella + Plátano + Queso de bola\n`);
        await client.sendMessage(msg.from, '*¡No olvides pedir la tuya!* 🍽️');
    
        await client.sendMessage(msg.from, '*¿Deseas ordenar o regresar al menú principal?*\n [1] 🛒 *Hacer un pedido*\n [0] 📋 *Ver más opciones*');
    
    
    }

    // Si el usuario solicita el horario de atención
    // Aquí puedes agregar la lógica para enviar el horario de atención
    if (msg.body.toString() === '7')
    {
        msg.reply('📆 *Nuestro horario de atención es el siguiente:*');
        if (fs.existsSync(hoariosPDFPath)) {
            const mimeType = mime.lookup(hoariosPDFPath) || 'application/pdf';
            const base64 = fs.readFileSync(hoariosPDFPath).toString('base64');
            const mediaPDF = new MessageMedia(mimeType, base64, 'horarios.pdf');

            await client.sendMessage(msg.from, mediaPDF);
        } else {
            await msg.reply('❌ No pudimos encontrar el menú en PDF en este momento.');
        }
        await client.sendMessage(msg.from, '*Desea regresar al menú principal?*\n [0] 📋 *Ver más opciones*');

    }  
});






client.initialize();
