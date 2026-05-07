export interface LocalServerBootPlan {
  defaultHost: string;
  defaultPort: number;
  apiBaseUrl: string;
  healthEndpoint: string;
  startupCommandPreview: string;
  requiresUserAction: boolean;
  productionNotes: string[];
}

export interface LocalServerBootCheck {
  portAvailable: boolean;
  canBind: boolean;
  alreadyRunning: boolean;
  conflicts: string[];
}

export class LocalServerBootStrategy {
  static getPlan(): LocalServerBootPlan {
    const host = process.env.AILLAME_LOCAL_SERVER_HOST || '127.0.0.1';
    const port = parseInt(process.env.AILLAME_LOCAL_SERVER_PORT || '3000', 10);

    return {
      defaultHost: host,
      defaultPort: port,
      apiBaseUrl: `http://${host}:${port}`,
      healthEndpoint: '/api/aillame/health',
      startupCommandPreview: `npm run start -- -p ${port}`,
      requiresUserAction: false,
      productionNotes: [
        "Windows Firewall may require port permission for non-localhost binding.",
        "Ensure no other Aillame instances are running on the same port.",
        "Local API keys are required for desktop-to-server communication in production."
      ]
    };
  }

  static getDiagnostics(): LocalServerBootCheck {
    // This is a foundation placeholder
    return {
      portAvailable: true,
      canBind: true,
      alreadyRunning: false,
      conflicts: []
    };
  }
}
