/**
 * WebSocket bridge entre el backend Express y los agentes locales.
 * - Mantiene registros de clientes (navegadores) y agentes Electron conectados.
 * - Recibe solicitudes de impresión desde el frontend y las despacha al
 *   primer agente disponible.
 * - Rutea los resultados (`print_success` / `print_error`) de regreso al
 *   cliente que originó el ticket.
 * - Administra keep-alives, reconexiones y estadísticas básicas.
 *
 * Este servicio permite que, aunque el backend esté en la nube, la impresión
 * térmica se ejecute en la máquina local donde está conectada la Hasar.
 */
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.agents = new Map(); // Almacenar agentes conectados
    this.clients = new Map(); // Almacenar clientes web conectados
    this.pendingPrintRequests = new Map(); // requestId -> { clientId, timestamp }
    
    this.setupServer();
  }

  setupServer() {
    console.log('🔌 Iniciando servidor WebSocket...');

    this.wss.on('connection', (ws, request) => {
      const clientId = uuidv4();
      const clientIP = request.socket.remoteAddress;
      
      console.log(`📱 Nueva conexión WebSocket: ${clientId} desde ${clientIP}`);
      
      // Configurar cliente
      ws.id = clientId;
      ws.isAlive = true;
      ws.lastPing = Date.now();
      
      // Manejar mensajes
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Error procesando mensaje WebSocket:', error);
          this.sendError(ws, 'Formato de mensaje inválido');
        }
      });

      // Manejar pong (keepalive)
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastPing = Date.now();
      });

      // Manejar desconexión
      ws.on('close', (code, reason) => {
        console.log(`🔌 Cliente desconectado: ${clientId} (${code}: ${reason})`);
        this.handleDisconnection(ws);
      });

      // Manejar errores
      ws.on('error', (error) => {
        console.error(`❌ Error WebSocket ${clientId}:`, error);
        this.handleDisconnection(ws);
      });

      // Enviar mensaje de bienvenida
      this.sendMessage(ws, 'connection_established', {
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Conectado al servidor ERP'
      });
    });

    // Configurar ping/pong para mantener conexiones vivas
    this.setupHeartbeat();
  }

  handleMessage(ws, message) {
    const { type, data } = message;
    
    console.log(`📨 Mensaje recibido de ${ws.id}: ${type}`);

    switch (type) {
      case 'register_agent':
        this.registerAgent(ws, data);
        break;
      case 'register_client':
        this.registerClient(ws, data);
        break;
      case 'print_ticket':
        this.handlePrintTicket(ws, data);
        break;
      case 'print_success':
        this.handlePrintResult(ws, data, true);
        break;
      case 'print_error':
        this.handlePrintResult(ws, data, false);
        break;
      case 'agent_status':
        this.handleAgentStatus(ws, data);
        break;
      case 'ping':
        this.handlePing(ws, data);
        break;
      case 'pong':
        this.handlePong(ws, data);
        break;
      default:
        console.warn(`⚠️ Tipo de mensaje desconocido: ${type}`);
        this.sendError(ws, `Tipo de mensaje desconocido: ${type}`);
    }
  }

  registerAgent(ws, data) {
    data = data || {};
    console.log(`🤖 Registrando agente: ${ws.id}`);
    
    ws.type = 'agent';
    ws.agentInfo = {
      platform: data.platform,
      hostname: data.hostname,
      version: data.version,
      environment: data.environment,
      tenant: data.tenant || null,
      printerNumber: data.printerNumber != null ? String(data.printerNumber) : null
    };
    
    this.agents.set(ws.id, ws);
    
    this.sendMessage(ws, 'registration_success', {
      message: 'Agente registrado correctamente',
      agentId: ws.id
    });
    
    console.log(`✅ Agente registrado: ${ws.id} (${data.platform}) tenant=${ws.agentInfo.tenant || '-'} impresora=${ws.agentInfo.printerNumber || '-'}`);
  }

  registerClient(ws, data) {
    data = data || {};
    console.log(`💻 Registrando cliente web: ${ws.id}`);
    
    ws.type = 'client';
    ws.clientInfo = {
      userAgent: data.userAgent,
      tenant: data.tenant,
      usuario: data.usuario,
      printerNumber: data.printerNumber != null ? String(data.printerNumber) : null
    };
    
    this.clients.set(ws.id, ws);
    
    this.sendMessage(ws, 'registration_success', {
      message: 'Cliente registrado correctamente',
      clientId: ws.id,
      availableAgents: this.getAvailableAgents()
    });
    
    console.log(`✅ Cliente registrado: ${ws.id} tenant=${ws.clientInfo.tenant || '-'} impresora=${ws.clientInfo.printerNumber || '-'}`);
  }

  handlePrintTicket(ws, data) {
    console.log(`🖨️ Solicitud de impresión de ${ws.id}`);
    
    const requestId = data.requestId || uuidv4();
    const requestedTenant = data.tenant || null;
    const requestedPrinter = data.printerNumber != null ? String(data.printerNumber) : null;

    let availableAgents = Array.from(this.agents.values()).filter(agent => 
      agent.readyState === WebSocket.OPEN
    );

    if (requestedTenant) {
      availableAgents = availableAgents.filter(agent => agent.agentInfo?.tenant === requestedTenant);
    }

    if (requestedPrinter) {
      availableAgents = availableAgents.filter(agent => agent.agentInfo?.printerNumber === requestedPrinter);
    }

    if (availableAgents.length === 0) {
      console.log('❌ No hay agentes disponibles para la combinación solicitada');
      this.sendMessage(ws, 'print_error', {
        error: 'No hay un agente disponible para esta impresora',
        saleId: data.sale?.id,
        requestId
      });
      return;
    }

    const targetAgent = availableAgents[0];

    const payloadForAgent = {
      ...data,
      requestId,
      requestedBy: ws.id,
      timestamp: new Date().toISOString()
    };

    // Persist request so we can route the response back to the originating client
    this.pendingPrintRequests.set(requestId, {
      clientId: ws.id,
      agentId: targetAgent.id,
      tenant: requestedTenant,
      printerNumber: requestedPrinter,
      createdAt: Date.now()
    });

    console.log(`📤 Enviando ticket al agente: ${targetAgent.id} (requestId=${requestId}, tenant=${requestedTenant || '-'}, impresora=${requestedPrinter || '-'})`);

    this.sendMessage(targetAgent, 'print_ticket', payloadForAgent);

    // Confirmar al cliente que se envió
    this.sendMessage(ws, 'print_sent', {
      message: 'Ticket enviado al agente para impresión',
      agentId: targetAgent.id,
      saleId: data.sale?.id,
      requestId,
      tenant: requestedTenant,
      printerNumber: requestedPrinter
    });
  }

  handlePrintResult(ws, data, success) {
    const resultType = success ? 'print_success' : 'print_error';
    console.log(`📊 Resultado de impresión: ${resultType} de agente ${ws.id}`);

    const { requestId } = data || {};

    if (!requestId) {
      console.warn('⚠️ Resultado de impresión sin requestId, enviando broadcast');
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          this.sendMessage(client, resultType, data);
        }
      });
      return;
    }

    const pending = this.pendingPrintRequests.get(requestId);
    if (pending) {
      console.log(`🔁 Respuesta asociada al cliente ${pending.clientId} tenant=${pending.tenant || '-'} impresora=${pending.printerNumber || '-'}`);
    }
    if (!pending) {
      console.warn(`⚠️ No se encontró request pendiente para requestId=${requestId}`);
      return;
    }

    this.pendingPrintRequests.delete(requestId);

    const client = this.clients.get(pending.clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      this.sendMessage(client, resultType, data);
    } else {
      console.warn(`⚠️ Cliente ${pending.clientId} no disponible para requestId=${requestId}`);
    }
  }

  handleAgentStatus(ws, data) {
    console.log(`📊 Estado del agente ${ws.id}: ${data.status}`);
    
    if (ws.agentInfo) {
      ws.agentInfo.status = data.status;
      ws.agentInfo.lastUpdate = new Date().toISOString();
    }
    
    // Notificar a los clientes sobre el cambio de estado
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, 'agent_status_update', {
          agentId: ws.id,
          status: data.status,
          agentInfo: ws.agentInfo
        });
      }
    });
  }

  handlePing(ws, data) {
    this.sendMessage(ws, 'pong', {
      timestamp: new Date().toISOString(),
      originalTimestamp: data.timestamp
    });
  }

  handlePong(ws, data) {
    ws.isAlive = true;
    ws.lastPing = Date.now();
  }

  handleDisconnection(ws) {
    if (ws.type === 'agent') {
      this.agents.delete(ws.id);
      console.log(`🤖 Agente desconectado: ${ws.id}`);
      
      // Notificar a los clientes
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          this.sendMessage(client, 'agent_disconnected', {
            agentId: ws.id
          });
        }
      });
    } else if (ws.type === 'client') {
      this.clients.delete(ws.id);
      console.log(`💻 Cliente desconectado: ${ws.id}`);
    }
  }

  sendMessage(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendMessage(ws, 'error', { error });
  }

  getAvailableAgents() {
    return Array.from(this.agents.values())
      .filter(agent => agent.readyState === WebSocket.OPEN)
      .map(agent => ({
        id: agent.id,
        info: agent.agentInfo
      }));
  }

  setupHeartbeat() {
    console.log('💓 Configurando heartbeat WebSocket...');
    
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log(`💀 Terminando conexión inactiva: ${ws.id}`);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Cada 30 segundos

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Método para enviar mensajes desde otros servicios
  broadcastToAgents(type, data) {
    this.agents.forEach(agent => {
      if (agent.readyState === WebSocket.OPEN) {
        this.sendMessage(agent, type, data);
      }
    });
  }

  broadcastToClients(type, data) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, type, data);
      }
    });
  }

  getStats() {
    const agentsList = Array.from(this.agents.values())
      .filter(agent => agent.readyState === WebSocket.OPEN)
      .map(agent => ({
        id: agent.id,
        platform: agent.agentInfo?.platform || 'unknown',
        hostname: agent.agentInfo?.hostname || 'unknown',
        version: agent.agentInfo?.version || 'unknown',
        environment: agent.agentInfo?.environment || 'unknown',
        tenant: agent.agentInfo?.tenant || null,
        printerNumber: agent.agentInfo?.printerNumber || null,
        status: agent.agentInfo?.status || 'connected',
        lastUpdate: agent.agentInfo?.lastUpdate || null,
        isAlive: agent.isAlive || false,
        lastPing: agent.lastPing || null
      }));

    const clientsList = Array.from(this.clients.values())
      .filter(client => client.readyState === WebSocket.OPEN)
      .map(client => ({
        id: client.id,
        tenant: client.clientInfo?.tenant || null,
        printerNumber: client.clientInfo?.printerNumber || null,
        usuario: client.clientInfo?.usuario || null
      }));

    return {
      totalConnections: this.wss.clients.size,
      agents: {
        total: this.agents.size,
        available: this.getAvailableAgents().length,
        list: agentsList
      },
      clients: {
        total: this.clients.size,
        connected: clientsList.length,
        list: clientsList
      },
      pendingPrintRequests: this.pendingPrintRequests.size
    };
  }
}

module.exports = WebSocketServer;
