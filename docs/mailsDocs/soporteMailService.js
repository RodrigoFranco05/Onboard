/**
 * Servicio de notificaciones por email para el modulo de Soporte
 *
 * Envia notificaciones por email cuando:
 * - Se crea un nuevo ticket (a todos los usuarios con notificarCreacion=true y email configurado)
 * - Se asigna/reasigna un ticket a un agente (al agente, si tiene notificarAsignacion=true y email)
 *
 * Los destinatarios se obtienen de la tabla soporte_NotificacionConfig por tenant.
 * Configurable desde Configuracion de Soporte > Notificaciones.
 */

const { enviarMailSoporte } = require('./soporteMailTransporter');

// ============================================
// TEMPLATES DE EMAIL
// ============================================

/**
 * Construir HTML para notificacion de ticket creado
 */
const buildMailTicketCreado = (tenant, ticketData) => {
  const { numero, titulo, descripcion, tipo, prioridad, categoria } = ticketData;

  return {
    subject: `Nuevo ticket creado - ${tenant} - ${numero || 'S/N'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px;">
          Nuevo Ticket Creado
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 130px;">Ambiente:</td>
            <td style="padding: 8px 12px;">${tenant}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Numero:</td>
            <td style="padding: 8px 12px;">${numero || 'S/N'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Tipo:</td>
            <td style="padding: 8px 12px;">${tipo || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Prioridad:</td>
            <td style="padding: 8px 12px;">${prioridad || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Categoria:</td>
            <td style="padding: 8px 12px;">${categoria || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Titulo:</td>
            <td style="padding: 8px 12px;">${titulo || 'Sin titulo'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Descripcion:</td>
            <td style="padding: 8px 12px;">${descripcion || 'Sin descripcion'}</td>
          </tr>
        </table>

        <hr style="margin-top: 25px; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          Lutente ERP Soporte - Notificacion automatica
        </p>
      </div>
    `
  };
};

/**
 * Construir HTML para notificacion de ticket asignado
 */
const buildMailTicketAsignado = (tenant, ticketData, nombreAgente) => {
  const { numero, titulo, descripcion, tipo, prioridad, categoria } = ticketData;

  return {
    subject: `Ticket asignado - ${tenant} - ${numero || 'S/N'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #388e3c; border-bottom: 2px solid #388e3c; padding-bottom: 10px;">
          Ticket Asignado
        </h2>

        <p style="font-size: 14px; color: #333;">
          Se te ha asignado el siguiente ticket${nombreAgente ? `, <strong>${nombreAgente}</strong>` : ''}:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; width: 130px;">Ambiente:</td>
            <td style="padding: 8px 12px;">${tenant}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Numero:</td>
            <td style="padding: 8px 12px;">${numero || 'S/N'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Tipo:</td>
            <td style="padding: 8px 12px;">${tipo || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Prioridad:</td>
            <td style="padding: 8px 12px;">${prioridad || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Categoria:</td>
            <td style="padding: 8px 12px;">${categoria || 'N/A'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 8px 12px; font-weight: bold; color: #555;">Titulo:</td>
            <td style="padding: 8px 12px;">${titulo || 'Sin titulo'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #555; vertical-align: top;">Descripcion:</td>
            <td style="padding: 8px 12px;">${descripcion || 'Sin descripcion'}</td>
          </tr>
        </table>

        <hr style="margin-top: 25px; border: none; border-top: 1px solid #ddd;" />
        <p style="font-size: 12px; color: #999; margin-top: 10px;">
          Lutente ERP Soporte - Notificacion automatica
        </p>
      </div>
    `
  };
};

// ============================================
// FUNCIONES DE NOTIFICACION
// ============================================

/**
 * Notificar por email que se creo un nuevo ticket.
 * Envia a todos los usuarios configurados con notificarCreacion=true y email cargado.
 * Fire-and-forget: no lanza error si falla el envio.
 *
 * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
 * @param {string} tenant - Nombre del tenant
 * @param {Object} ticketData - Datos del ticket { numero, titulo, descripcion, tipo, prioridad, categoria }
 */
const notificarTicketCreado = async (sequelize, tenant, ticketData) => {
  try {
    const { adminModelInit } = require('../../models/adminModel');
    const { soporteModelInit } = require('../../models/soporteModel');
    const { Usuario } = adminModelInit(sequelize);
    const { Soporte_NotificacionConfig } = soporteModelInit(sequelize);

    const configs = await Soporte_NotificacionConfig.findAll({
      where: { notificarCreacion: true, eliminado: false },
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'usuario', 'nombre', 'apellido', 'email', 'eliminado'],
        required: true,
        where: { eliminado: false }
      }]
    });

    const destinatarios = configs
      .map(c => c.usuario?.email)
      .filter(email => !!email && String(email).trim() !== '');

    if (destinatarios.length === 0) {
      console.log(`[SoporteMail] No hay destinatarios activos con email para notificacion de creacion (tenant: ${tenant}).`);
      return;
    }

    const { subject, html } = buildMailTicketCreado(tenant, ticketData);

    const resultados = await Promise.allSettled(
      destinatarios.map(to => enviarMailSoporte({ to, subject, html }))
    );

    resultados.forEach((res, idx) => {
      const to = destinatarios[idx];
      if (res.status === 'fulfilled') {
        console.log(`[SoporteMail] Ticket creado: notificacion enviada a ${to} (tenant: ${tenant})`);
      } else {
        console.error(`[SoporteMail] Error al enviar notificacion de ticket creado a ${to} (tenant: ${tenant}):`, res.reason?.message || res.reason);
      }
    });
  } catch (error) {
    console.error(`[SoporteMail] Error al enviar notificacion de ticket creado (tenant: ${tenant}):`, error.message);
    // Fire-and-forget: no propagar el error
  }
};

/**
 * Notificar por email que un ticket fue asignado/reasignado a un agente.
 * Solo envia si el agente tiene notificarAsignacion=true en soporte_NotificacionConfig.
 * Fire-and-forget: no lanza error si falla el envio.
 *
 * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
 * @param {string} tenant - Nombre del tenant
 * @param {Object} ticketData - Datos del ticket { numero, titulo, descripcion, tipo, prioridad, categoria }
 * @param {number} agentId - ID del agente asignado
 */
const notificarTicketAsignado = async (sequelize, tenant, ticketData, agentId) => {
  try {
    if (!agentId) {
      console.log('[SoporteMail] No hay agentId, omitiendo notificacion de asignacion.');
      return;
    }

    const { adminModelInit } = require('../../models/adminModel');
    const { soporteModelInit } = require('../../models/soporteModel');
    const { Usuario } = adminModelInit(sequelize);
    const { Soporte_NotificacionConfig } = soporteModelInit(sequelize);

    const config = await Soporte_NotificacionConfig.findOne({
      where: { usuarioId: parseInt(agentId), notificarAsignacion: true, eliminado: false }
    });

    if (!config) {
      console.log(`[SoporteMail] Agente ID ${agentId} no tiene notificarAsignacion activo, omitiendo notificacion (tenant: ${tenant}).`);
      return;
    }

    const agente = await Usuario.findByPk(parseInt(agentId), {
      attributes: ['id', 'usuario', 'nombre', 'apellido', 'email']
    });

    if (!agente) {
      console.log(`[SoporteMail] Agente con ID ${agentId} no encontrado, omitiendo notificacion.`);
      return;
    }

    if (!agente.email || String(agente.email).trim() === '') {
      console.log(`[SoporteMail] Agente "${agente.usuario}" (ID: ${agentId}) no tiene email cargado, omitiendo notificacion.`);
      return;
    }

    const nombreAgente = [agente.nombre, agente.apellido].filter(Boolean).join(' ') || agente.usuario;
    const { subject, html } = buildMailTicketAsignado(tenant, ticketData, nombreAgente);

    await enviarMailSoporte({
      to: agente.email,
      subject,
      html
    });

    console.log(`[SoporteMail] Notificacion de ticket asignado enviada a ${agente.email} (agente: ${nombreAgente}, tenant: ${tenant})`);
  } catch (error) {
    console.error(`[SoporteMail] Error al enviar notificacion de ticket asignado (tenant: ${tenant}, agentId: ${agentId}):`, error.message);
    // Fire-and-forget: no propagar el error
  }
};

module.exports = {
  notificarTicketCreado,
  notificarTicketAsignado
};
