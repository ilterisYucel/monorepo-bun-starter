import React, { useState, useCallback, useMemo } from 'react'
import { useRacks, useSetPower } from './hooks/useRacks'
import { useSystemHistorical } from './hooks/useHistoricalData'
import { useAuth } from './stores/AuthStore'
import { Login } from './components/auth/Login'
import { LogoutButton } from './components/auth/LogoutButton'
import { AdminPanel } from './components/admin/AdminPanel'
import { MultiLineChart, type ChartDataPoint } from './components/MultiLineChart'
import { PowerFlowAnimation } from './components/animation/PowerFlowAnimation'
import type { OperationMode, Rack } from './types'
import './App.css'

const AppContent: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuth()

  // DOĞRU HOOK'LAR - useRacks ve useSystemHistorical
  const { data: racks = [], isLoading, refetch: refreshRacks } = useRacks()
  const { data: systemData = [] } = useSystemHistorical(100)
  const { mutate: setPower, isPending: isPowerSending } = useSetPower()

  const [durationSeconds, setDurationSeconds] = useState<number>(30)
  const [operationMode, setOperationMode] = useState<OperationMode>('CONTINUOUS')
  const [powerKw, setPowerKw] = useState<number>(50)
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const [activeCommand, setActiveCommand] = useState<{
    isActive: boolean
    remainingSeconds?: number
  } | null>(null)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  // Tüm rack'lerin charge_status'u ne durumda?
  const allRacksChargeStatus =
    racks.length > 0 ? racks.every((r: Rack) => r.charge_status === 'Charge') : false
  const allRacksDischargeStatus =
    racks.length > 0 ? racks.every((r: Rack) => r.charge_status === 'Discharge') : false
  const allRacksIdleStatus =
    racks.length > 0 ? racks.every((r: Rack) => r.charge_status === 'Idle') : false
  const isMixedStatus = !allRacksChargeStatus && !allRacksDischargeStatus && !allRacksIdleStatus

  const getSystemStatus = (): 'Charge' | 'Discharge' | 'Idle' => {
    if (allRacksChargeStatus) return 'Charge'
    if (allRacksDischargeStatus) return 'Discharge'
    return 'Idle'
  }

  const systemStatus = getSystemStatus()

  // Butonların aktiflik durumu
  const isChargeDisabled = isPowerSending || allRacksChargeStatus
  const isDischargeDisabled = isPowerSending || allRacksDischargeStatus
  const isIdleDisabled = isPowerSending || allRacksIdleStatus

  const chartData: ChartDataPoint[] = useMemo(() => {
    return systemData.map((point) => ({
      timestamp: point.timestamp,
      'Sistem Voltajı (mV)': point.voltage ?? 0,
      'Sistem Akımı (A)': point.current ?? 0
    }))
  }, [systemData])

  // Timer temizleme
  const clearTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setActiveCommand(null)
  }, [timerInterval])

  // Idle komutu (timer bitince)
  const sendIdleCommand = useCallback(() => {
    setPower(
      { chargeStatus: 'Idle', powerKw: 0, durationSeconds: 0 },
      {
        onSuccess: () => {
          setActiveCommand(null)
          refreshRacks()
        }
      }
    )
  }, [setPower, refreshRacks])

  // Timer başlat
  const startTimer = useCallback(
    (durationSeconds: number) => {
      clearTimer()
      setActiveCommand({ isActive: true, remainingSeconds: durationSeconds })

      const interval = setInterval(() => {
        setActiveCommand((prev) => {
          if (!prev || prev.remainingSeconds === undefined) return null
          const newRemaining = prev.remainingSeconds - 1
          if (newRemaining <= 0) {
            clearInterval(interval)
            sendIdleCommand()
            return null
          }
          return { ...prev, remainingSeconds: newRemaining }
        })
      }, 1000)
      setTimerInterval(interval)
    },
    [clearTimer, sendIdleCommand]
  )

  // Power komutu gönder
  const sendPowerCommand = useCallback(
    (chargeStatus: 'Charge' | 'Discharge') => {
      const finalDurationSeconds = operationMode === 'TIMER' ? durationSeconds : 31536000 // 1 yıl

      setPower(
        { chargeStatus, powerKw, durationSeconds: finalDurationSeconds },
        {
          onSuccess: () => {
            setMessage({
              type: 'success',
              text:
                operationMode === 'TIMER'
                  ? `Tüm rack'ler ${chargeStatus === 'Charge' ? 'şarja' : 'deşarja'} başladı! ${durationSeconds} saniye sonra otomatik duracak.`
                  : `Tüm rack'ler ${chargeStatus === 'Charge' ? 'şarja' : 'deşarja'} başladı! (Sürekli mod)`
            })

            if (operationMode === 'TIMER') {
              startTimer(durationSeconds)
            } else {
              setActiveCommand({ isActive: true })
            }

            setTimeout(() => setMessage(null), 5000)
            refreshRacks()
          },
          onError: () => {
            setMessage({ type: 'error', text: 'Komut gönderilemedi!' })
            setTimeout(() => setMessage(null), 3000)
          }
        }
      )
    },
    [operationMode, durationSeconds, powerKw, setPower, startTimer, refreshRacks]
  )

  // Acil durdur
  const sendStopCommand = useCallback(() => {
    setPower(
      { chargeStatus: 'Idle', powerKw: 0, durationSeconds: 0 },
      {
        onSuccess: () => {
          clearTimer()
          setActiveCommand(null)
          setMessage({ type: 'info', text: "Tüm rack'ler durduruldu!" })
          setTimeout(() => setMessage(null), 3000)
          refreshRacks()
        },
        onError: () => {
          setMessage({ type: 'error', text: 'Durdurma başarısız!' })
          setTimeout(() => setMessage(null), 3000)
        }
      }
    )
  }, [setPower, clearTimer, refreshRacks])

  // Format süre
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Rack kartı badge rengi
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getStatusColor = (status: string) =>
    status === 'online' ? 'badge-online' : 'badge-offline'
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const getChargeStatusClass = (chargeStatus: string | null) => {
    if (chargeStatus === 'Charge') return 'badge-charge'
    if (chargeStatus === 'Discharge') return 'badge-discharge'
    return 'badge-idle'
  }

  // Giriş yapılmadıysa Login göster
  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="app">
      <LogoutButton />

      {/* <div className="header">
        <h1>🔋 Battery Rack Controller</h1>
      </div> */}

      <div className="charts-grid">
        <div className="chart-container">
          <PowerFlowAnimation flowDirection={systemStatus} />
        </div>

        <div className="chart-container">
          <MultiLineChart
            data={chartData}
            title="📊 Sistem Ölçümleri"
            yAxisLabel="Değer"
            height={450}
            colors={['#3b82f6', '#f59e0b']}
          />
        </div>
      </div>

      <div className="main-layout">
        {/* Rack Grid */}
        <div className="racks-section">
          {isLoading ? (
            <div>Yükleniyor...</div>
          ) : (
            <div className="rack-grid">
              {racks.map((rack: Rack) => (
                <div key={rack.id} className="rack-card">
                  <div className="rack-card-header">
                    <span className="rack-name">{rack.name}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${getStatusColor(rack.status || 'offline')}`}>
                        {rack.status || 'offline'}
                      </span>
                      <span className={`badge ${getChargeStatusClass(rack.charge_status)}`}>
                        {rack.charge_status || 'Idle'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-blue">SoC: {rack.soc ?? 'N/A'}%</span>
                  </div>
                  <div className="rack-details">
                    <div className="rack-detail-item">
                      <span>🔋 Voltage:</span>
                      <strong>{rack.voltage ?? 'N/A'} mV</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>⚡ Current:</span>
                      <strong>{rack.current ?? 'N/A'} A</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>💪 Power:</span>
                      <strong>{rack.power_kw ?? 'N/A'} kW</strong>
                    </div>
                    <div className="rack-detail-item">
                      <span>🌡️ Temp:</span>
                      <strong>{rack.temperature ?? 'N/A'} °C</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div className="control-section">
          <h3 className="section-title">🎮 Kontrol Paneli</h3>

          {/* Çalışma Modu */}
          <div className="form-group">
            <label>🎯 Çalışma Modu</label>
            <div className="radio-group">
              <div
                className={`radio-option ${operationMode === 'TIMER' ? 'active' : ''}`}
                onClick={() => !isPowerSending && setOperationMode('TIMER')}
                style={{
                  cursor: isPowerSending ? 'not-allowed' : 'pointer',
                  opacity: isPowerSending ? 0.5 : 1
                }}
              >
                ⏱️ Timer Modu
              </div>
              <div
                className={`radio-option ${operationMode === 'CONTINUOUS' ? 'active' : ''}`}
                onClick={() => !isPowerSending && setOperationMode('CONTINUOUS')}
                style={{
                  cursor: isPowerSending ? 'not-allowed' : 'pointer',
                  opacity: isPowerSending ? 0.5 : 1
                }}
              >
                🔄 Sürekli Mod
              </div>
            </div>
          </div>

          {/* Timer Süresi */}
          {operationMode === 'TIMER' && (
            <div className="form-group">
              <label>⏱️ Süre (Saniye)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                min={1}
                max={28800}
                step={30}
                disabled={isPowerSending}
              />
              <small>Süre dolduğunda otomatik Idle&apos;a geçer.</small>
            </div>
          )}

          {/* Güç Ayarları */}
          <div className="form-group">
            <label>⚡ Güç (kW)</label>
            <input
              type="number"
              value={powerKw}
              onChange={(e) => setPowerKw(Number(e.target.value))}
              min={0}
              max={500}
              step={10}
              disabled={isPowerSending}
            />
          </div>

          {/* Butonlar */}
          <div className="form-group">
            <label>🔘 Kontrol</label>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={() => sendPowerCommand('Charge')}
                disabled={isChargeDisabled}
              >
                🔋 ŞARJ
              </button>
              <button
                className="btn btn-warning"
                onClick={() => sendPowerCommand('Discharge')}
                disabled={isDischargeDisabled}
              >
                ⚡ DEŞARJ
              </button>
              <button
                className="btn btn-danger"
                onClick={sendStopCommand}
                disabled={isIdleDisabled}
              >
                🛑 DURDUR
              </button>
            </div>
          </div>

          {/* Mesaj */}
          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          {/* Bilgi */}
          <div className="info-box">
            💡{' '}
            {operationMode === 'TIMER'
              ? 'Timer modunda süre dolunca otomatik Idle.'
              : 'Sürekli modda DURDUR butonu ile durdur.'}
            {isMixedStatus && " ⚠️ Rack'ler farklı durumlarda!"}
          </div>

          {/* Timer Göstergesi */}
          {activeCommand?.isActive && activeCommand.remainingSeconds !== undefined && (
            <div className="timer-display">
              <div className="time">{formatTime(activeCommand.remainingSeconds)}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Kalan süre</div>
            </div>
          )}

          {/* Admin Panel - SADECE ADMIN GÖRÜR */}
          {isAdmin && <AdminPanel onRefresh={refreshRacks} />}
        </div>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return <AppContent />
}

export default App
