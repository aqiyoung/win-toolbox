/**
 * 应用主组件 — 桌面窗口框架 + 路由
 */

import { useState } from 'react';
import { Layout, Menu } from 'antd';
import { FileTextOutlined, VideoCameraOutlined, FileImageOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import TitleBar from './components/TitleBar';
import HomePage from './pages/Home';
import ConvertPage from './pages/Convert';
import TasksPage from './pages/Tasks';
import SettingsPage from './pages/Settings';

const { Header, Sider, Content } = Layout;

type Page = 'home' | 'convert' | 'tasks' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [activePluginId, setActivePluginId] = useState<string | null>(null);

  const handlePluginClick = (pluginId: string) => {
    setActivePluginId(pluginId);
    setPage('convert');
  };

  const handleBack = () => {
    setActivePluginId(null);
    setPage('home');
  };

  const menuItems = [
    { key: 'home', icon: <FileTextOutlined />, label: '首页' },
    { key: 'tasks', icon: <HistoryOutlined />, label: '任务' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          height: 48,
          lineHeight: '48px',
        }}
      >
        <TitleBar />
      </Header>

      <Layout>
        <Sider
          width={180}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[page === 'convert' ? 'home' : page]}
            items={menuItems}
            onClick={({ key }) => {
              if (key !== 'convert') {
                setPage(key as Page);
                setActivePluginId(null);
              }
            }}
            style={{ borderRight: 0, marginTop: 8 }}
          />
        </Sider>

        <Content style={{ background: '#f5f7fa', overflow: 'auto' }}>
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
