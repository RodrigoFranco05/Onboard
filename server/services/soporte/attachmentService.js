/**
 * Servicio para manejo de adjuntos de tickets
 * 
 * Este servicio se encarga de:
 * - Validar archivos (extensión, tipo MIME, tamaño)
 * - Guardar archivos como base64 en base de datos
 * - Crear registros en base de datos
 * 
 * Referencia: sistema-tickets-backend.md Sección 3.3
 */

const path = require('path');

class AttachmentService {
  
  // Extensiones permitidas
  static ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
  
  // Tipos MIME permitidos
  static ALLOWED_MIMES = [
    'image/png',
    'image/jpeg',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  /**
   * Validar archivo antes de guardar
   * 
   * @param {Object} file - Objeto con { name, contentType, size, data/buffer }
   * @param {number} maxSizeMb - Tamaño máximo en MB
   * @throws {Error} Si el archivo no es válido
   * 
   * @example
   * AttachmentService.validateFile({
   *   name: 'documento.pdf',
   *   contentType: 'application/pdf',
   *   size: 1024000
   * }, 50);
   */
  static validateFile(file, maxSizeMb) {
    // Aceptar tanto 'type' como 'contentType' para compatibilidad con frontend
    const contentType = file.contentType || file.type;
    if (!file.name || !contentType || !file.size) {
      throw new Error('Archivo incompleto: faltan name, contentType/type o size');
    }

    const ext = path.extname(file.name).toLowerCase();
    
    // Validar extensión
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Extensión no permitida: ${ext}. Permitidas: ${this.ALLOWED_EXTENSIONS.join(', ')}`);
    }
    
    // Validar tipo MIME (usar contentType o type)
    if (!this.ALLOWED_MIMES.includes(contentType.toLowerCase())) {
      throw new Error(`Tipo MIME no permitido: ${contentType}. Permitidos: ${this.ALLOWED_MIMES.join(', ')}`);
    }

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`Archivo muy grande. Máximo: ${maxSizeMb}MB`);
    }

    return true;
  }

  /**
   * Procesar archivo para guardar como base64
   * 
   * @param {Object} file - Objeto con { name, contentType, size, data (base64) o buffer }
   * @returns {Promise<Object>} - Objeto con { archivo: base64, name, size }
   * 
   * @example
   * const processed = await AttachmentService.processFile({
   *   name: 'documento.pdf',
   *   contentType: 'application/pdf',
   *   size: 1024000,
   *   data: 'base64...'
   * });
   */
  static async processFile(file) {
    let base64Data;
    

    // Guardar archivo (desde base64 o buffer)
    if (file.data) {
      // Si ya viene en base64 (data:image/png;base64,...)
      if (file.data.startsWith('data:')) {
        // Extraer solo la parte base64 después de la coma
        base64Data = file.data.split(',')[1] || file.data;
      } else {
        // Si ya es base64 puro
        base64Data = file.data;
      }
    } else if (file.buffer) {
      // Convertir buffer a base64
      base64Data = file.buffer.toString('base64');
    } else {
      throw new Error('Formato de archivo no válido: se requiere data (base64) o buffer');
    }

    return {
      archivo: base64Data,
      name: file.name,
      size: file.size
    };
  }

  /**
   * Guardar múltiples adjuntos en transacción como base64
   * 
   * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
   * @param {string} tenant - Nombre del tenant
   * @param {string} ticketId - UUID del ticket
   * @param {string|null} mensajeId - UUID del mensaje (opcional)
   * @param {Array} adjuntos - Array de objetos file
   * @param {number} maxSizeMb - Tamaño máximo en MB
   * @param {Transaction} transaction - Transacción de Sequelize
   * @returns {Promise<Array>} - Array de Soporte_TicketAdjunto creados
   * 
   * @example
   * const adjuntos = await AttachmentService.saveAttachments(
   *   sequelize, 'demo', ticketId, mensajeId, files, 50, transaction
   * );
   */
  static async saveAttachments(sequelize, tenant, ticketId, mensajeId, adjuntos, maxSizeMb, transaction) {
    const { Soporte_TicketAdjunto } = require('../../models/soporteModel').soporteModelInit(sequelize);
    const adjuntosGuardados = [];

    for (const file of adjuntos) {
      // Validar
      this.validateFile(file, maxSizeMb);

      // Procesar archivo a base64
      const processed = await this.processFile(file);

      // Crear registro en DB con base64
      const adjunto = await Soporte_TicketAdjunto.create({
        ticketId,
        mensajeId: mensajeId || null,
        archivo: processed.archivo,
        name: processed.name,
        contentType: file.contentType || file.type,
        size: processed.size
      }, { transaction });

      adjuntosGuardados.push(adjunto);
    }

    return adjuntosGuardados;
  }

  /**
   * Obtener archivo base64 para servir
   * 
   * @param {Object} adjunto - Objeto Soporte_TicketAdjunto con propiedad archivo (base64)
   * @returns {Object} - Objeto con { data: base64, contentType, name }
   * 
   * @example
   * const fileData = AttachmentService.getFileData(adjunto);
   */
  static getFileData(adjunto) {
    if (!adjunto.archivo) {
      throw new Error('Adjunto no tiene contenido base64');
    }

    return {
      data: adjunto.archivo,
      contentType: adjunto.contentType,
      name: adjunto.name
    };
  }
}

module.exports = { AttachmentService };
