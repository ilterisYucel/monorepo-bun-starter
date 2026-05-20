import { apiClient } from '../shared/axios'
import type {
  Rack,
  SystemDataPoint,
  SetPowerRequest,
  SetStatusRequest,
  SetSOCRequest
} from '../types'

export const api = {
  // Rack'leri getir
  getRacks: async (): Promise<Rack[]> => {
    const response = await apiClient.get('/racks/latest')
    return response.data.racks || []
  },

  // Sistem tarihsel verisi (tek voltage, tek current)
  getSystemHistoricalData: async (limit: number = 200): Promise<SystemDataPoint[]> => {
    const response = await apiClient.get(`/racks/history?limit=${limit}`)
    const history = response.data.history || []

    const systemData: SystemDataPoint[] = []

    history.forEach((snapshot: Rack[]) => {
      if (snapshot.length === 0) return
      const firstRack = snapshot[0] as Rack

      systemData.push({
        timestamp: firstRack.timestamp,
        voltage: firstRack.voltage ?? 0,
        current: firstRack.current !== null ? firstRack.current * 8 : 0
      })
    })

    return systemData.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  },

  // Status komutu (online/offline)
  setStatus: async (status: 'online' | 'offline', rackId?: number): Promise<void> => {
    const payload: SetStatusRequest = { status }
    if (rackId !== undefined) payload.rack_id = rackId
    await apiClient.post('/commands/status', payload)
  },

  // SoC komutu
  setSoc: async (socPercent: number, rackId?: number): Promise<void> => {
    const payload: SetSOCRequest = { soc: socPercent }
    if (rackId !== undefined) payload.rack_id = rackId
    await apiClient.post('/commands/soc', payload)
  },

  // Power komutu (Charge/Discharge/Idle)
  setPower: async (
    chargeStatus: 'Charge' | 'Discharge' | 'Idle',
    powerKw: number,
    durationSeconds: number,
    rackId?: number
  ): Promise<void> => {
    const payload: SetPowerRequest = {
      charge_status: chargeStatus,
      power_kw: powerKw,
      duration_seconds: durationSeconds
    }
    if (rackId !== undefined) payload.rack_id = rackId
    await apiClient.post('/commands/power', payload)
  }
}
