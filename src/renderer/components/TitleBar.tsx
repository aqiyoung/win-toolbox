/**
 * 标题栏 — 拖拽区 + 窗口控制按钮（无边框窗口用）
 */

import { Button } from 'antd';
import { MinusOutlined, BorderOutlined, CloseOutlined } from '@ant-design/icons';

export default function TitleBar() {
  return (
    <div
      className="titlebar"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        height: 36,
        padding: '0 4px',
      }}
    >
      <div className="no-drag" style={{ display: 'flex', gap: 2 }}>
        <Button
          type="text"
          size="small"
          icon={<MinusOutlined />}
          onClick={() => (window as any).electron?.minimize?.()}
          style={{ width: 36, height: 32, color: '#666' }}
        />
        <Button
          type="text"
          size="small"
          icon={<BorderOutlined style={{ fontSize: 10 }} />}
          onClick={() => (window as any).electron?.maximize?.()}
          style={{ width: 36, height: 32, color: '#666' }}
        />
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => window.close()}
          style={{ width: 36, height: 32, color: '#666' }}
        />
      </div>
    </div>
  );
}
