/**
 * 首页 — 插件入口，分类 + 搜索 + 卡片网格
 */

import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Typography, Spin, Input, Tag, Empty } from 'antd';
import { FileTextOutlined, VideoCameraOutlined, FileImageOutlined, AudioOutlined, SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { PluginManifest, PluginCategory } from '@shared/types';

const { Title, Text } = Typography;

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  document: { label: '📄 文档转换', icon: <FileTextOutlined />, color: '#1677ff' },
  video:   { label: '🎬 视频处理', icon: <VideoCameraOutlined />, color: '#f5222d' },
  image:   { label: '🖼️ 图片处理', icon: <FileImageOutlined />, color: '#52c41a' },
  audio:   { label: '🎵 音频处理', icon: <AudioOutlined />, color: '#722ed1' },
};

interface HomePageProps {
  onPluginClick: (pluginId: string) => void;
}

export default function HomePage({ onPluginClick }: HomePageProps) {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PluginCategory | 'all'>('all');

  useEffect(() => {
    window.toolbox
      .getPlugins()
      .then((p: PluginManifest[]) => setPlugins(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = plugins;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    return list;
  }, [plugins, activeCategory, query]);

  const grouped = useMemo(() => {
    const result: Record<string, PluginManifest[]> = {};
    for (const p of filtered) {
      if (!result[p.category]) result[p.category] = [];
      result[p.category].push(p);
    }
    return result;
  }, [filtered]);

  const categoriesPresent = useMemo(() => {
    return [...new Set(plugins.map((p) => p.category))];
  }, [plugins]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          🔧 Win Toolbox
        </Title>
        <Text type="secondary">免费开源的 Windows 工具箱，让文件转换与批处理变得简单</Text>
      </div>

      {/* 搜索 */}
      <Input
        placeholder="🔍 搜索功能，例如'PDF'、'图片缩放'"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="large"
        style={{ marginBottom: 24, borderRadius: 8 }}
        allowClear
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
      />

      {/* 分类筛选 */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <div
            className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <AppstoreOutlined /> 全部 ({plugins.length})
          </div>
          {categoriesPresent.map((cat) => {
            const meta = CATEGORY_META[cat];
            if (!meta) return null;
            return (
              <div
                key={cat}
                className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{ color: activeCategory === cat ? meta.color : undefined }}
              >
                {meta.icon} {meta.label.slice(2)} (
                {plugins.filter((p) => p.category === cat).length})
              </div>
            );
          })}
        </div>
      </div>

      {/* 插件网格 */}
      {Object.keys(grouped).length === 0 ? (
        <Empty description="没有找到匹配的功能" />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const meta = CATEGORY_META[category] ?? {
            label: category,
            icon: null,
            color: '#999',
          };
          return (
            <div key={category} style={{ marginBottom: 32 }}>
              <Title
                level={5}
                style={{ marginBottom: 16, color: meta.color }}
              >
                {meta.label}
              </Title>
              <Row gutter={[16, 16]}>
                {items.map((plugin) => (
                  <Col span={6} key={plugin.id}>
                    <div
                      className="plugin-card"
                      onClick={() => onPluginClick(plugin.id)}
                    >
                      <div className="plugin-icon">{plugin.icon || '📦'}</div>
                      <div className="plugin-name">{plugin.name}</div>
                      <div className="plugin-desc">{plugin.description}</div>
                      <div style={{ marginTop: 6 }}>
                        <Tag color={meta.color} style={{ fontSize: 10 }}>
                          {plugin.inputFormats[0]} → {plugin.outputFormats[0]}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          );
        })
      )}
    </div>
  );
}

// 避免引入 antd Space —— 简单 inlined
function Space({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>;
}
