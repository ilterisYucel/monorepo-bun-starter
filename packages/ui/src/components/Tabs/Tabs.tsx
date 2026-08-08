import React, { useState, useCallback } from "react";
import * as S from "./Tabs.styles";

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  visible?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultKey?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultKey }) => {
  const visibleTabs = tabs.filter((t) => t.visible !== false);
  const initialKey =
    defaultKey && visibleTabs.some((t) => t.key === defaultKey)
      ? defaultKey
      : visibleTabs[0]?.key ?? "";
  const [activeKey, setActiveKey] = useState(initialKey);
  const handleTabClick = useCallback((key: string) => setActiveKey(key), []);

  if (visibleTabs.length <= 1) {
    return <>{visibleTabs[0]?.content}</>;
  }

  return (
    <S.TabsContainer>
      <S.TabBar>
        {visibleTabs.map((tab) => (
          <S.TabButton
            key={tab.key}
            active={tab.key === activeKey}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.label}
          </S.TabButton>
        ))}
      </S.TabBar>
      <S.TabContent>
        {visibleTabs.find((t) => t.key === activeKey)?.content}
      </S.TabContent>
    </S.TabsContainer>
  );
};
