export interface IDeviceDetailProvider {
  devices(deviceId: string): Promise<Array<{ id: string; type: string; status: string; lastSeen: string }>>;
}
