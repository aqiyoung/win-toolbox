/**
 * 任务页面 — 历史任务列表
 */

import { useCallback, useEffect, useState } from 'react';
import { List, Tag, Typography, Progress, Space, Button, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, LoadingOutlined, FolderOpenOutlined } from '@ant-design/icons';
import type { Task } from '../../../shared/types';

const { Text } = Typography;

const STATUS_TAG: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'default', icon: <ClockCircleOutlined /> },
  running: { color: 'processing', icon: <LoadingOutlined spin /> },
  completed: { color: 'success', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', icon: <CloseCircleOutlined /> },
  cancelled: { color: 'warning', icon: <CloseCircleOutlined /> },
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(() => {
    window.toolbox.listTasks().then((t: Task[]) => setTasks(t)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // 监听进度变化,触发 UI 重渲染
    const off1 = window.toolbox.onTaskProgress(load);
    const off2 = window.toolbox.onTaskCompleted(load);
    const off3 = window.toolbox.onTaskFailed(load);
    return () => {
      off1();
      off2();
      off3();
    };
  }, [load]);

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        📋 任务记录
      </Typography.Title>

      {tasks.length === 0 ? (
        <Empty description="暂无任务" />
      ) : (
        <List
          dataSource={tasks}
          renderItem={(task) => {
            const tag = STATUS_TAG[task.status] ?? STATUS_TAG.pending;
            return (
              <List.Item
                key={task.id}
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: '16px 20px',
                  marginBottom: 8,
                }}
                actions={
                  task.outputFiles && task.outputFiles.length > 0
                    ? [
                        <Button
                          key="open"
                          type="link"
                          size="small"
                          icon={<FolderOpenOutlined />}
                          onClick={() => window.toolbox.openDir(task.outputFiles![0])}
                        >
                          打开目录
                        </Button>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{task.pluginName}</span>
                      <Tag color={tag.color} icon={tag.icon}>
                        {task.status === 'running' ? '进行中' :
                         task.status === 'completed' ? '完成' :
                         task.status === 'failed' ? '失败' :
                         task.status === 'cancelled' ? '已取消' : '等待'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {task.inputs.map((f) => f.name).join(', ')}
                      </Text>
                      {task.status === 'running' && (
                        <Progress
                          percent={task.progress.percent}
                          size="small"
                          status="active"
                          style={{ marginTop: 6, maxWidth: 300 }}
                        />
                      )}
                      {task.error && (
                        <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
                          {task.error}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
