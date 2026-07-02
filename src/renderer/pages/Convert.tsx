/**
 * 转换页面 — 配置 + 执行 + 进度
 */

import { useEffect, useRef, useState } from 'react';
import {
  Card,
  Button,
  Select,
  InputNumber,
  Typography,
  Space,
  Progress,
  message,
  Divider,
  Row,
  Col,
  Switch,
} from 'antd';
import { ArrowLeftOutlined, FolderOpenOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ProgressInfo, PluginManifest, FileInfo } from '@shared/types';

const { Text, Title } = Typography;

interface ConvertPageProps {
  pluginId: string;
  onBack: () => void;
}

interface ConvertOptions {
  strategy: 'structured' | 'hybrid' | 'screenshot';
  slideRatio: '4:3' | '16:9' | 'match_pdf';
  dpi: number;
  fontFallback: string;
  outputDir: string;
  autoOpen: boolean;
}

export default function ConvertPage({ pluginId, onBack }: ConvertPageProps) {
  const [plugin, setPlugin] = useState<PluginManifest | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [options, setOptions] = useState<ConvertOptions>({
    strategy: 'hybrid',
    slideRatio: 'match_pdf',
    dpi: 200,
    fontFallback: '微软雅黑',
    outputDir: '',
    autoOpen: true,
  });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const unsubs = useRef<(() => void)[]>([]);

  // 加载插件信息
  useEffect(() => {
    window.toolbox.getPlugin(pluginId).then((p: PluginManifest | undefined) => {
      if (p) setPlugin(p);
    });
    window.toolbox.getSettings().then((s: Record<string, unknown>) => {
      setOptions((prev) => ({ ...prev, outputDir: (s.outputDir as string) ?? '' }));
    });

    // 订阅任务事件
    const off1 = window.toolbox.onTaskProgress(({ taskId: id, progress: p }) => {
      if (id === taskId) setProgress(p);
    });
    const off2 = window.toolbox.onTaskCompleted(({ taskId: id, files }) => {
      if (id === taskId) {
        setRunning(false);
        setProgress({ percent: 100, stage: '完成' });
        message.success(`转换完成! 输出 ${files.length} 个文件`);
        if (options.autoOpen && files.length > 0) {
          window.toolbox.openDir(files[0]);
        }
      }
    });
    const off3 = window.toolbox.onTaskFailed(({ taskId: id, error }) => {
      if (id === taskId) {
        setRunning(false);
        message.error(`转换失败: ${error}`);
      }
    });

    unsubs.current = [off1, off2, off3];
    return () => unsubs.current.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginId]);

  // 选择文件
  const handleSelectFiles = async () => {
    const paths = await window.toolbox.selectFilesMultiple();
    if (paths && paths.length > 0) {
      const infos: FileInfo[] = await Promise.all(
        paths.map(async (p: string) => ({
          path: p,
          name: p.split(/[\\/]/).pop() || p,
          size: 0,
          mimeType: '',
        })),
      );
      setFiles(infos);
      // 默认输出目录 = 第一个文件所在目录
      if (!options.outputDir && paths.length > 0) {
        const dir = paths[0].replace(/[\\/][^\\/]+$/, '');
        setOptions((prev) => ({ ...prev, outputDir: dir }));
      }
    }
  };

  const handleSelectOutputDir = async () => {
    const dir = await window.toolbox.selectDirectory();
    if (dir) {
      setOptions((prev) => ({ ...prev, outputDir: dir }));
    }
  };

  // 开始转换
  const handleStart = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }

    try {
      setRunning(true);
      setProgress({ percent: 0, stage: '准备中...' });

      const finalOptions: Record<string, unknown> = {
        ...options,
        output_dir: options.outputDir,
      };

      const id = await window.toolbox.startTask({
        pluginId,
        inputs: files,
        options: finalOptions,
      });

      setTaskId(id);
    } catch (err: unknown) {
      setRunning(false);
      message.error(err instanceof Error ? err.message : '启动失败');
    }
  };

  if (!plugin) return null;

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} type="link">
          返回
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {plugin.icon} {plugin.name}
        </Title>
      </Space>

      <Text type="secondary">{plugin.description}</Text>

      {/* 文件选择 */}
      <Card title="1. 选择文件" style={{ marginTop: 24 }} bordered={false}>
        <div
          className="drop-zone"
          onClick={handleSelectFiles}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('dragging');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragging');
            const paths = Array.from(e.dataTransfer.files).map((f: any) => f.path);
            if (paths.length > 0) {
              const infos: FileInfo[] = paths.map((p: string) => ({
                path: p,
                name: p.split(/[\\/]/).pop() || p,
                size: 0,
                mimeType: '',
              }));
              setFiles(infos);
            }
          }}
        >
          {files.length > 0 ? (
            <div>
              <div style={{ fontSize: 13, color: '#555' }}>
                已选择 {files.length} 个文件:
              </div>
              {files.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  📄 {f.name}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: '#555' }}>
                点击选择文件 或 拖拽到此处
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                支持格式: {plugin.inputFormats.map((f) => `.${f}`).join(', ')}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 配置 */}
      <Card title="2. 转换设置" style={{ marginTop: 16 }} bordered={false}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>转换策略</Text>
              <Select
                value={options.strategy}
                onChange={(v) => setOptions((p) => ({ ...p, strategy: v }))}
                disabled={running}
                options={[
                  { value: 'hybrid', label: '🔀 混合 (推荐,可编辑 + 保真)' },
                  { value: 'structured', label: '📝 纯结构化 (完全可编辑)' },
                  { value: 'screenshot', label: '📸 截图保真 (视觉一致,不可编辑)' },
                ]}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>PPT 比例</Text>
              <Select
                value={options.slideRatio}
                onChange={(v) => setOptions((p) => ({ ...p, slideRatio: v }))}
                disabled={running || options.strategy === 'screenshot'}
                options={[
                  { value: 'match_pdf', label: '与 PDF 一致' },
                  { value: '16:9', label: '16:9' },
                  { value: '4:3', label: '4:3' },
                ]}
                style={{ width: '100%' }}
              />
            </Space>
          </Col>
        </Row>

        {options.strategy !== 'structured' && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>渲染 DPI</Text>
                  <InputNumber
                    value={options.dpi}
                    onChange={(v) => setOptions((p) => ({ ...p, dpi: v || 200 }))}
                    min={72}
                    max={600}
                    step={50}
                    disabled={running}
                    style={{ width: '100%' }}
                    addonAfter="DPI"
                  />
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>缺失字体替代</Text>
                  <Select
                    value={options.fontFallback}
                    onChange={(v) => setOptions((p) => ({ ...p, fontFallback: v }))}
                    disabled={running}
                    options={[
                      { value: '微软雅黑' },
                      { value: '宋体' },
                      { value: '黑体' },
                      { value: 'Arial' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Space>
              </Col>
            </Row>
          </>
        )}

        <Divider style={{ margin: '16px 0' }} />
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>输出目录</Text>
              <Space.Compact style={{ width: '100%' }}>
                <InputNumber
                  value={undefined}
                  style={{ display: 'none' }}
                />
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={handleSelectOutputDir}
                  disabled={running}
                >
                  {options.outputDir || '默认 (源文件所在目录)'}
                </Button>
              </Space.Compact>
            </Space>
          </Col>
          <Col>
            <Space direction="vertical">
              <Text strong>自动打开</Text>
              <Switch
                checked={options.autoOpen}
                onChange={(v) => setOptions((p) => ({ ...p, autoOpen: v }))}
                disabled={running}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 执行 */}
      <Card title="3. 执行" style={{ marginTop: 16 }} bordered={false}>
        <Button
          type="primary"
          size="large"
          block
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          loading={running}
          disabled={files.length === 0}
        >
          {running ? '转换中...' : '开始转换'}
        </Button>

        {progress && (
          <div style={{ marginTop: 20 }}>
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Text>{progress.stage}</Text>
              <Text type="secondary">{progress.percent}%</Text>
            </Row>
            <Progress
              percent={progress.percent}
              status={running ? 'active' : progress.percent === 100 ? 'success' : 'exception'}
              strokeColor={{ from: '#1677ff', to: '#69b1ff' }}
            />
            {progress.detail && (
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                {progress.detail}
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
