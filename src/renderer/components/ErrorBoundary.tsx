/**
 * ErrorBoundary — 捕获渲染错误，避免整个页面白屏
 */

import React from 'react';
import { Button, Typography, Space } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 40,
          }}
        >
          <BugOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <Title level={4} style={{ marginBottom: 8 }}>页面渲染出错</Title>
          <Text type="secondary" style={{ marginBottom: 16, textAlign: 'center', maxWidth: 400 }}>
            {this.state.error?.message || '未知错误'}
          </Text>
          <details style={{ marginBottom: 16, maxWidth: 500, width: '100%' }}>
            <summary style={{ cursor: 'pointer', color: '#999', fontSize: 12 }}>
              查看详情
            </summary>
            <pre
              style={{
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 6,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 200,
                marginTop: 8,
              }}
            >
              {this.state.error?.stack || '无堆栈'}
            </pre>
          </details>
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              重试
            </Button>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </Space>
        </div>
      );
    }

    return this.props.children;
  }
}
