// emailService.js - Servicio para envío de correos
const nodemailer = require('nodemailer');
let empresaBD;

// Configurar el transportador de correo (reutilizable)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true para puerto 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // ¡IMPORTANTE: Usa variables de entorno en producción!
    },
    tls: {
        rejectUnauthorized: false // Solo si tienes problemas con certificados
    }
});

const enviarCorreosFormulario = async (datos) => {
    try {
        const { name, company, number, email, comments, tenant } = datos;
        let mailToEmpresa;
        let mailToUsuario;
        
        // Validación básica
        if (!name || !email) {
            throw new Error('Faltan campos requeridos: name y/o email');
        }


        switch (tenant) {
            case 'lutente':
                empresaBD = process.env.EMAIL_COMPANY_LUTENTE; // email de la empresa que va a recibir el mail con la consulta, se obtiene del .env
                
                if (!empresaBD) {
                    throw new Error('Faltan campos requeridos: empresaBD');
                }
                
                mailToEmpresa = buildMailToEmpresaLutente({ name, company, email, number, comments, empresaBD });
                mailToUsuario = buildMailToUsuarioLutente({ name, company, email, number, comments });
                break;
            case 'ceccone':
                empresaBD = process.env.EMAIL_COMPANY_CECCONE; // email de la empresa que va a recibir el mail con la consulta, se obtiene del .env
                
                if (!empresaBD) {
                    throw new Error('Faltan campos requeridos: empresaBD');
                }
                
                mailToEmpresa = buildMailToEmpresaCeccone({ name, company, email, number, comments, empresaBD });
                mailToUsuario = buildMailToUsuarioCeccone({ name, company, email, number, comments });
                break;
        }
        
        // se envia el correo hacia la empresa con la consulta realizada por el usuario
        const resultadoEmpresa = await transporter.sendMail(mailToEmpresa);
        console.log('✅ Correo enviado a la empresa:', empresaBD);

        // se envia el mansaje de confirmacion al usuario
        const resultadoUsuario = await transporter.sendMail(mailToUsuario);
        console.log('✅ Correo de confirmación enviado a:', email);

        return {
            success: true,
            message: 'Correos enviados correctamente',
            empresaMessageId: resultadoEmpresa.messageId,
            usuarioMessageId: resultadoUsuario.messageId
        };

    } catch (error) {
        console.error('❌ Error al enviar correos:', error);
        throw error; // Propagar el error al controller
    }
};

// Verificar conexión SMTP (opcional, útil para debugging)
const verificarConexion = async () => {
    try {
        await transporter.verify();
        console.log('✅ Servidor SMTP listo para enviar correos');
        return true;
    } catch (error) {
        console.error('❌ Error en la conexión SMTP:', error);
        return false;
    }
};


const enviarCorreosConfirmacionPago = async (datos) => {
    try {
        const { name, number, email, tenant, items, totalPrice } = datos;
        let mailToUsuario;
        console.log(name)
        console.log(email)
        // Validación básica
        if (!name || !email) {
            throw new Error('Faltan campos requeridos: name y/o email');
        }


        switch (tenant) {
            case 'ceccone':
                
                mailToUsuario = buildMailToUsuarioConfirmacionPagoCeccone({ 
                    name, 
                    number, 
                    email, 
                    items, 
                    totalPrice 
                });
                break;
        }
        

        // se envia el mansaje de confirmacion al usuario
        const resultadoUsuario = await transporter.sendMail(mailToUsuario);
        console.log('✅ Correo de confirmación enviado a:', email);

        return {
            success: true,
            message: 'Correos enviados correctamente',
            usuarioMessageId: resultadoUsuario.messageId
        };

    } catch (error) {
        console.error('❌ Error al enviar correos:', error);
        throw error; // Propagar el error al controller
    }
};

function buildMailToEmpresaLutente({ name, company, email, number, comments, empresaBD }) {
    return {
        from: '"Lutente Web" <admin@lutente.com>',
        to: empresaBD,
        subject: 'Nuevo mensaje del formulario de contacto',
        html: `
        <h3>Nuevo mensaje de contacto</h3>
        <p><span style="text-decoration: underline;"><span style="font-size: 14pt;">Datos del solicitante:</span></span></p>
        <ul>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Nombre</strong>: ${name}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Empresa/Negocio</strong>: ${company || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Email</strong>: ${email}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Número</strong>: ${number || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Mensaje</strong>: ${comments || 'Sin mensaje'}</span></li>
        </ul>
        <p>De Lutente Web.</p>
    `
    };
}

function buildMailToUsuarioLutente({ name, company, email, number, comments }) {
    return {
        from: '"Lutente Web" <admin@lutente.com>',
        to: email,
        subject: 'Gracias por contactarnos',
        html: `
        <h3>¡Hemos recibido tu correo! Gracias por contactarnos</h3>
        <p><span style="text-decoration: underline;"><span style="font-size: 14pt;">Estos son los datos que enviaste:</span></span></p>
        <ul>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Nombre</strong>: ${name}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Empresa/Negocio</strong>: ${company || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Email</strong>: ${email}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Número</strong>: ${number || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Mensaje</strong>: ${comments || 'Sin mensaje'}</span></li>
        </ul>
        <p>Te responderemos lo antes posible.</p>
        <p>Si tienes alguna pregunta adicional, no dudes en contactarnos.</p>
        <p>Saludos cordiales,</p>
        <p>De Lutente Web.</p>
    `
    };
}

function buildMailToEmpresaCeccone({ name, company, email, number, comments, empresaBD }) {
    return {
        from: '"Ceccone Ferreteria E-commerce " <admin@lutente.com>',
        to: empresaBD,
        subject: 'Nuevo mensaje del formulario de contacto',
        html: `
        <h3>Nuevo mensaje de contacto</h3>
        <p><span style="text-decoration: underline;"><span style="font-size: 14pt;">Datos del solicitante:</span></span></p>
        <ul>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Nombre</strong>: ${name}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Empresa/Negocio</strong>: ${company || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Email</strong>: ${email}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Número</strong>: ${number || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Mensaje</strong>: ${comments || 'Sin mensaje'}</span></li>
        </ul>
        <p>De Ceccone Ferreteria E-commerce.</p>
    `
    };
}

function buildMailToUsuarioCeccone({ name, company, email, number, comments }) {
    return {
        from: '"Ceccone Ferreteria" <admin@lutente.com>',
        to: email,
        subject: 'Gracias por contactarnos',
        html: `
        <h3>¡Hemos recibido tu correo! Gracias por contactarnos</h3>
        <p><span style="text-decoration: underline;"><span style="font-size: 14pt;">Estos son los datos que enviaste:</span></span></p>
        <ul>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Nombre</strong>: ${name}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Empresa/Negocio</strong>: ${company || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Email</strong>: ${email}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Número</strong>: ${number || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Mensaje</strong>: ${comments || 'Sin mensaje'}</span></li>
        </ul>
        <p>Te responderemos lo antes posible.</p>
        <p>Si tienes alguna pregunta adicional, no dudes en contactarnos.</p>
        <p>Saludos cordiales,</p>
        <p>De Ceccone Ferreteria.</p>
    `
    };
}

function buildMailToUsuarioConfirmacionPagoCeccone({ name, company, email, number, comments, items, totalPrice }) {
    // Generar HTML para los items del carrito
    let itemsHtml = '';
    if (items && items.length > 0) {
        itemsHtml = '<ul style="list-style-type: none; padding: 0;">';
        items.forEach(item => {
            itemsHtml += `
                <li style="border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 14pt;">
                        <strong>${item.title || item.description || 'Producto'}</strong>
                    </div>
                    <div style="font-size: 12pt; color: #666; margin: 5px 0;">
                        Cantidad: ${item.quantity}
                    </div>
                    <div style="font-size: 12pt; color: #666;">
                        Precio unitario: $${item.unit_price}
                    </div>
                    <div style="font-size: 12pt; font-weight: bold; color: #333;">
                        Subtotal: $${(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                </li>
            `;
        });
        itemsHtml += '</ul>';
    } else {
        itemsHtml = '<p style="font-size: 14pt;">No se encontraron items en el pedido.</p>';
    }

    return {
        from: '"Ceccone Ferreteria" <admin@lutente.com>',
        to: email,
        subject: 'Gracias por elegirnos!',
        html: `
        <h3>¡Hemos recibido tu pedido! </h3>
        <p><span style="text-decoration: underline;"><span style="font-size: 14pt;">Estos son los datos de tu pedido:</span></span></p>
        <ul>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Nro. del pedido (id)</strong>: ${name}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Precio Final</strong>: $${totalPrice || 'N/A'}</span></li>
            <li style="font-size: 14pt;"><span style="font-size: 14pt;"><strong>Medio de pago</strong>: ${number || 'N/A'}</span></li>
        </ul>
        
        <h4 style="font-size: 16pt; margin-top: 20px;">Items de tu pedido:</h4>
        ${itemsHtml}
        
        <p>Te responderemos lo antes posible cuando tengamos el pedido listo.</p>
        <p>Si tienes alguna pregunta adicional, no dudes en contactarnos.</p>
        <p>Saludos cordiales,</p>
        <p>De Ceccone Ferreteria.</p>
    `
    };
}

module.exports = {
    enviarCorreosFormulario,
    enviarCorreosConfirmacionPago,
    verificarConexion
};