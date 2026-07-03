/**
 * 主布局 — 深色侧边栏 + 浅色内容区
 */

import { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar } from 'antd';
import {
  HomeOutlined,
  HistoryOutlined,
  SettingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import TitleBar from './components/TitleBar';
import HomePage from './pages/Home';
import ConvertPage from './pages/Convert';
import TasksPage from './pages/Tasks';
import SettingsPage from './pages/Settings';
const logoUrl = new URL('../build/logo-256.png', import.meta.url).href;

const { Sider, Content } = Layout;
const { Text } = Typography;

type Page = 'home' | 'convert' | 'tasks' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [activePluginId, setActivePluginId] = useState<string | null>(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.toolbox.getAppVersion().then(setVersion).catch(() => {});
  }, []);

  const handlePluginClick = (pluginId: string) => {
    setActivePluginId(pluginId);
    setPage('convert');
  };

  const handleBack = () => {
    setActivePluginId(null);
    setPage('home');
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 自定义标题栏 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          zIndex: 1000,
          background: 'transparent',
        }}
      >
        <TitleBar />
      </div>

      <Layout style={{ marginTop: 36 }}>
        {/* ─── 深色侧边栏 ─── */}
        <Sider
          width={220}
          style={{
            background: 'linear-gradient(180deg, #1a1f2e 0%, #161b26 100%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            overflow: 'auto',
          }}
        >
          {/* Logo 区 */}
          <div style={{ padding: '20px 16px 16px', textAlign: 'center' }}>
            <Avatar
              size={48}
              src={logoUrl}
              style={{
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              icon={<ToolOutlined />}
            />
            <div style={{ marginTop: 10 }}>
              <Text style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
                Win Toolbox
              </Text>
              {version && (
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    v{version}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* 功能区 */}
          <div style={{ padding: '0 12px' }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '0 12px',
                marginBottom: 6,
              }}
            >
              功能区
            </Text>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[page]}
              onClick={({ key }) => {
                if (key !== 'convert') {
                  setPage(key as Page);
                  setActivePluginId(null);
                }
              }}
              style={{ background: 'transparent', border: 'none' }}
              items={[
                {
                  key: 'home',
                  icon: <HomeOutlined />,
                  label: '功能首页',
                },
              ]}
            />
          </div>

          {/* 管理区 */}
          <div style={{ padding: '0 12px', marginTop: 16 }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 1,
                padding: '0 12px',
                marginBottom: 6,
              }}
            >
              管理区
            </Text>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[page]}
              onClick={({ key }) => {
                setPage(key as Page);
                setActivePluginId(null);
              }}
              style={{ background: 'transparent', border: 'none' }}
              items={[
                {
                  key: 'tasks',
                  icon: <HistoryOutlined />,
                  label: '任务记录',
                },
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: '设置',
                },
              ]}
            />
          </div>

          {/* 底部 */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px 16px',
              textAlign: 'center',
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
              开源免费 · MIT License
            </Text>
          </div>
        </Sider>

        {/* ─── 内容区 ─── */}
        <Content
          style={{
            background: '#f5f7fa',
            overflow: 'auto',
            minHeight: 'calc(100vh - 36px)',
          }}
        >
          {page === 'home' && <HomePage onPluginClick={handlePluginClick} />}
          {page === 'convert' && activePluginId && (
            <ConvertPage pluginId={activePluginId} onBack={handleBack} />
          )}
          {page === 'tasks' && <TasksPage />}
          {page === 'settings' && <SettingsPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
