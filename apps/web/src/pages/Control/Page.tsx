// src/pages/ControlPage/ControlPage.tsx
import React from "react";
import { Scheduler } from "../../components/Scheduler/Scheduler";
import "./styles.css";

export const ControlPage: React.FC = () => {
  return (
    <div className="control-page">
      <div className="control-page-content">
        <div className="scheduler-wrapper">
          <Scheduler />
        </div>
      </div>
    </div>
  );
};
