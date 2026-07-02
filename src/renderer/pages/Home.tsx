/**
 * 首页 — 插件入口网格
 */

import { useEffect, useState } from 'react';
import { Row, Col, Typography, Spin } from 'antd';
import { FileTextOutlined, VideoCameraOutlined, FileImageOutlined } from '@ant-design/icons';
import type { PluginManifest } from '../../../shared/types';

const { Title, Text } = Typography;

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  document: { label: '文档转换', icon: <FileTextOutlined /> },
  video: { label: '视频处理', icon: <VideoCameraOutlined /> },
  image: { label: '图片处理', icon: <FileImageOutlined /> },
};

interface HomePageProps {
  onPluginClick: (pluginId: string) => void;
}

export default function HomePage({ onPluginClick }: HomePageProps) {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.toolbox
      .getPlugins()
      .then((p: PluginManifest[]) => setPlugins(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  const grouped: Record<string, PluginManifest[]> = {};
  for (const p of plugins) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 8 }}>
        🔧 Win Toolbox
      </Title>
      <Text type="secondary">选择一个工具开始使用</Text>

      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_META[category] ?? { label: category, icon: null };
        return (
          <div key={category} style={{ marginTop: 32 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              {meta.icon} {meta.label}
            </Title>
            <Row gutter={[16, 16]}>
              {items.map((plugin) => (
                <Col span={6} key={plugin.id}>
                  <div className="plugin-card" onClick={() => onPluginClick(plugin.id)}>
                    <div className="plugin-icon">{plugin.icon || '📦'}</div>
                    <div className="plugin-name">{plugin.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {plugin.inputFormats.join(', ')} → {plugin.outputFormats.join(', ')}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        );
      })}
    </div>
  );
}
