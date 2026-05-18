// src/components/Scheduler/Scheduler.tsx
import React, { useState } from "react";
import "./Scheduler.css";

interface ScheduledCommand {
  id: string;
  datetime: string; // ISO string olarak sakla
  type: "Charge" | "Discharge";
  powerKw: number;
}

export const Scheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 16), // YYYY-MM-DDThh:mm formatında
  );
  const [selectedType, setSelectedType] = useState<"Charge" | "Discharge">(
    "Charge",
  );
  const [powerKw, setPowerKw] = useState<number>(50);
  const [scheduledList, setScheduledList] = useState<ScheduledCommand[]>([]);

  // Tarihi formatla (Türkçe gösterim için)
  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Yeni komut ekle
  const handleAddCommand = () => {
    if (!selectedDate) return;
    const newCommand: ScheduledCommand = {
      id: Date.now().toString(),
      datetime: new Date(selectedDate).toISOString(),
      type: selectedType,
      powerKw: powerKw,
    };
    setScheduledList([...scheduledList, newCommand]);
  };

  // Komut sil
  const handleDeleteCommand = (id: string) => {
    setScheduledList(scheduledList.filter((cmd) => cmd.id !== id));
  };

  return (
    <div className="scheduler-container">
      <h4>⏰ Komut Zamanlayıcı</h4>

      {/* Yeni Komut Ekleme Formu */}
      <div className="scheduler-form">
        <div className="form-row">
          <label>Tarih & Saat:</label>
          <input
            type="datetime-local"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="datetime-input"
          />
        </div>
        <div className="form-row">
          <label>Komut:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
          >
            <option value="Charge">🔋 Şarj Et</option>
            <option value="Discharge">⚡ Deşarj Et</option>
          </select>
        </div>
        <div className="form-row">
          <label>Güç (kW):</label>
          <input
            type="number"
            value={powerKw}
            onChange={(e) => setPowerKw(Number(e.target.value))}
            min={0}
            max={500}
          />
        </div>
        <button onClick={handleAddCommand} className="add-btn">
          ➕ Zamanla
        </button>
      </div>

      {/* Planlanmış Komutlar Listesi */}
      <div className="scheduled-list">
        <h5>📋 Planlanmış Komutlar</h5>
        {scheduledList.length === 0 ? (
          <p className="empty-text">Henüz planlanmış bir komut yok.</p>
        ) : (
          <ul>
            {scheduledList.map((cmd) => (
              <li key={cmd.id}>
                <span className="cmd-date">{formatDateTime(cmd.datetime)}</span>
                <span
                  className={`cmd-type ${cmd.type === "Charge" ? "charge" : "discharge"}`}
                >
                  {cmd.type === "Charge" ? "🔋 ŞARJ" : "⚡ DEŞARJ"}
                </span>
                <span className="cmd-power">{cmd.powerKw} kW</span>
                <button
                  onClick={() => handleDeleteCommand(cmd.id)}
                  className="delete-btn"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
