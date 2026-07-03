/**
 * 首页 — Hero Banner + 分类筛选 + 功能卡片网格
 *
 * 设计原则 (Anthropic 风格):
 * - 柔和配色 + 高对比文字
 * - 清晰视觉层次 (Hero → Filter → Cards)
 * - 卡片带顶部色条 + hover 动效
 * - 大留白, 不拥挤
 */

import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Typography, Spin, Input, Empty, Badge } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  AudioOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { PluginManifest, PluginCategory } from '@shared/types';

const { Title, Text, Paragraph } = Typography;

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; gradient: string; desc: string }
> = {
  document: {
    label: '文档转换',
    icon: <FileTextOutlined />,
    color: '#1677ff',
    gradient: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
    desc: 'PDF / Word / PPT 互转与提取',
  },
  image: {
    label: '图片处理',
    icon: <FileImageOutlined />,
    color: '#52c41a',
    gradient: 'linear-gradient(135deg, #52c41a 0%, #95de64 100%)',
    desc: '缩放 / 格式转换 / 批量处理',
  },
  video: {
    label: '视频处理',
    icon: <VideoCameraOutlined />,
    color: '#f5222d',
    gradient: 'linear-gradient(135deg, #f5222d 0%, #ff7875 100%)',
    desc: '格式互转 / 压缩 / 提取音频',
  },
  audio: {
    label: '音频处理',
    icon: <AudioOutlined />,
    color: '#722ed1',
    gradient: 'linear-gradient(135deg, #722ed1 0%, #b37feb 100%)',
    desc: '敬请期待...',
  },
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
    if (activeCategory !== 'all')
      list = list.filter((p) => p.category === activeCategory);
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

  const categoriesPresent = useMemo(
    () => [...new Set(plugins.map((p) => p.category))],
    [plugins],
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: '28px 36px' }}>
      {/* ─── Hero Banner ─── */}
      <div className="hero-banner" style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
          <ThunderboltOutlined style={{ color: '#1677ff', marginRight: 8 }} />
          欢迎使用 Win Toolbox
        </Title>
        <Paragraph style={{ fontSize: 15, color: '#666', margin: '0 0 20px' }}>
          文档 · 图片 · 视频 — 简单、快速、完全免费
        </Paragraph>

        {/* 搜索框 */}
        <Input
          placeholder="搜索功能，例如「PDF 转 PPT」或「图片缩放」"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="large"
          allowClear
          prefix={<SearchOutlined style={{ color: '#bbb', marginRight: 6 }} />}
          style={{
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '10px 16px',
            fontSize: 14,
          }}
        />
      </div>

      {/* ─── 分类入口 ─── */}
      <div style={{ marginBottom: 28 }}>
        <Row gutter={[12, 12]}>
          {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = plugins.filter((p) => p.category === cat).length;
            const disabled = count === 0 && cat !== 'audio';
            const isActive = activeCategory === cat;
            return (
              <Col span={6} key={cat}>
                <div
                  className={`cat-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(isActive ? 'all' : cat)}
                  style={{
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div className="cat-icon" style={{ background: meta.gradient }}>
                    {meta.icon}
                  </div>
                  <div className="cat-info">
                    <div className="cat-label">{meta.label}</div>
                    <div className="cat-desc">{meta.desc}</div>
                  </div>
                  {count > 0 ? (
                    <Badge count={count} style={{ background: meta.color }} />
                  ) : (
                    <Text style={{ fontSize: 11, color: '#bbb' }}>即将推出</Text>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* ─── 插件网格 ─── */}
      {filtered.length === 0 ? (
        <Empty
          description={
            plugins.length === 0 ? (
              <div>
                <Text type="secondary">未检测到可用功能模块</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  请联系开发者报告此问题
                </Text>
              </div>
            ) : (
              <Text type="secondary">没有匹配的功能</Text>
            )
          }
          style={{ marginTop: 60 }}
        />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const meta = CATEGORY_META[category] ?? {
            label: category,
            color: '#999',
            gradient: 'linear-gradient(135deg,#999,#bbb)',
          };
          return (
            <div key={category} style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: meta.color,
                  }}
                />
                <Title level={5} style={{ margin: 0, color: '#333' }}>
                  {meta.label}
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                    {items.length} 个功能
                  </Text>
                </Title>
              </div>

              <Row gutter={[14, 14]}>
                {items.map((plugin) => (
                  <Col span={8} key={plugin.id}>
                    <div
                      className="plugin-card"
                      onClick={() => onPluginClick(plugin.id)}
                      style={{ '--cat-color': meta.color, '--cat-grad': meta.gradient } as any}
                    >
                      {/* 顶部色条 */}
                      <div className="plugin-card__accent" />

                      <div className="plugin-card__icon">{plugin.icon || '📦'}</div>
                      <div className="plugin-card__name">{plugin.name}</div>
                      <div className="plugin-card__desc">{plugin.description}</div>

                      <div className="plugin-card__formats">
                        {plugin.inputFormats.slice(0, 2).map((fmt) => (
                          <span key={fmt} className="format-tag">
                            .{fmt}
                          </span>
                        ))}
                        <ArrowRightOutlined style={{ fontSize: 10, color: '#bbb', margin: '0 3px' }} />
                        <span className="format-tag output">
                          .{plugin.outputFormats[0]}
                        </span>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          );
        })
      )}

      {/* ─── Footer ─── */}
      <div
        style={{
          textAlign: 'center',
          padding: '24px 0 16px',
          color: '#bbb',
          fontSize: 11,
        }}
      >
        Win Toolbox · 开源免费 · 持续更新中
      </div>
    </div>
  );
}
