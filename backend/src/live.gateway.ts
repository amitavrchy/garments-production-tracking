import { Inject } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from './auth/auth.service';
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3300').split(','),
    credentials: true,
  },
})
export class LiveGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  constructor(@Inject(AuthService) private auth: AuthService) {}
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('loom_session='))
        ?.slice(13);
      const actor = await this.auth.authenticate(token);
      await client.join(`factory:${actor.factoryId}`);
      for (const id of actor.lineIds) await client.join(`line:${id}`);
    } catch {
      client.disconnect(true);
    }
  }
  changed(factoryId: string, resource: string, lineId?: string) {
    this.server
      ?.to(`factory:${factoryId}`)
      .emit('changed', { resource, at: new Date().toISOString() });
    if (lineId) this.server?.to(`line:${lineId}`).emit('production', { lineId });
  }
}
