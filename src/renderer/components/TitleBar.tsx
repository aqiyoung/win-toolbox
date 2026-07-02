/**
 * 自定义标题栏 (无边框窗口)
 */

import { useEffect, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { MinusOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

declare global {
  interface Window {
    toolbox: {
      getAppVersion: () => Promise<string>;
    };
  }
}

export default function TitleBar() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.toolbox.getAppVersion().then(setVersion).catch(() => {});
  }, []);

  return (
    <div
      className="titlebar"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <Space>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>🔧</span>
        <Text strong>Win Toolbox</Text>
        {version && (
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
            v{version}
          </Text>
        )}
      </Space>

      <div className="no-drag" style={{ display: 'flex', gap: 4 }}>
        <Button
          type="text"
          size="small"
          icon={<MinusOutlined />}
          onClick={() => (window as any).electron?.minimize?.()}
          style={{ width: 32, height: 32 }}
        />
        <Button
          type="text"
          size="small"
          icon={<BorderOutlined />}
          onClick={() => (window as any).electron?.maximize?.()}
          style={{ width: 32, height: 32 }}
        />
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => window.close()}
          style={{ width: 32, height: 32 }}
          danger
        />
      </div>
    </div>
  );
}
