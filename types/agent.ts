export interface AgentConfig {
  id: string;
  name: string;
  openClawId: string;
  description: string | null;
  model: string | null;
  enabled: boolean;
}
