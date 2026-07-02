/**
 * 设置页面
 */

import { useEffect, useState } from 'react';
import { InputNumber, Switch, Typography, Card, Space, Button } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    window.toolbox.getSettings().then(setSettings).catch(() => {});
  }, []);

  const update = (key: string, value: unknown) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    window.toolbox.setSettings(next).catch(() => {});
  };

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        ⚙️ 设置
      </Title>

      <Card title="通用" bordered={false}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>默认输出目录</Text>
            <Space.Compact style={{ width: '100%' }}>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={async () => {
                  const dir = await window.toolbox.selectDirectory();
                  if (dir) update('outputDir', dir);
                }}
              >
                {(settings.outputDir as string) || '选择目录...'}
              </Button>
            </Space.Compact>
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>最大并发任务数</Text>
            <InputNumber
              min={1}
              max={8}
              value={(settings.maxConcurrent as number) ?? 3}
              onChange={(v) => update('maxConcurrent', v)}
              style={{ width: 120 }}
            />
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>转换完成后自动打开输出目录</Text>
            <Switch
              checked={settings.autoOpenOutput as boolean}
              onChange={(v) => update('autoOpenOutput', v)}
            />
          </Space>
        </Space>
      </Card>
    </div>
  );
}
