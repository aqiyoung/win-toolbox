/**
 * 通用转换页面 — 根据 manifest.configSchema 动态渲染配置
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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
  Input,
  Slider,
} from 'antd';
import { ArrowLeftOutlined, FolderOpenOutlined, PlayCircleOutlined, FileOutlined } from '@ant-design/icons';
import type { ProgressInfo, PluginManifest, FileInfo } from '@shared/types';

const { Text, Title, Paragraph } = Typography;

interface ConvertPageProps {
  pluginId: string;
  onBack: () => void;
}

/**
 * 根据 JSON Schema 属性描述渲染对应的表单控件
 */
function SchemaField({
  name,
  schema,
  value,
  onChange,
  disabled,
}: {
  name: string;
  schema: any;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
}) {
  const label = schema.description || name;

  // enum → Select
  if (schema.enum) {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>{label}</Text>
        <Select
          value={value ?? schema.default}
          onChange={onChange}
          disabled={disabled}
          style={{ width: '100%' }}
          options={schema.enum.map((v: string) => {
            // 给 enum 值加中文标签
            const labels: Record<string, string> = {
              hybrid: '🔀 混合 (推荐)',
              structured: '📝 纯结构化',
              screenshot: '📸 截图保真',
              match_pdf: '与源文件一致',
              '16:9': '16:9',
              '4:3': '4:3',
              percent: '按百分比',
              width: '指定宽度',
              height: '指定高度',
              fit: '适应 (保持比例)',
              same: '保持原格式',
              text: '提取文本',
              tables: '提取表格',
              all: '全部提取',
              best: '最佳质量',
              good: '高质量',
              medium: '中等',
              low: '低质量 (体积小)',
            };
            return { value: v, label: labels[v] ?? v };
          })}
        />
      </Space>
    );
  }

  // boolean → Switch
  if (schema.type === 'boolean') {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>{label}</Text>
        <Switch
          checked={value ?? schema.default ?? false}
          onChange={onChange}
          disabled={disabled}
          checkedChildren="开"
          unCheckedChildren="关"
        />
      </Space>
    );
  }

  // number → InputNumber or Slider
  if (schema.type === 'number') {
    const min = schema.minimum ?? 0;
    const max = schema.maximum ?? 9999;
    const useSlider = max - min <= 1000 && min >= 0;
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>{label}</Text>
        {useSlider ? (
          <Slider
            value={value ?? schema.default ?? min}
            onChange={onChange}
            min={min}
            max={max}
            disabled={disabled}
            marks={Object.fromEntries(
              [min, Math.round((min + max) / 2), max].map((v) => [v, String(v)]),
            )}
          />
        ) : (
          <InputNumber
            value={value ?? schema.default}
            onChange={(v) => onChange(v)}
            min={min}
            max={max}
            step={schema.step || 1}
            disabled={disabled}
            style={{ width: '100%' }}
            addonAfter={schema.unit || ''}
          />
        )}
      </Space>
    );
  }

  // string → Input
  if (schema.type === 'string') {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>{label}</Text>
        <Input
          value={value ?? schema.default ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={schema.default ? `默认: ${schema.default}` : ''}
        />
      </Space>
    );
  }

  return null;
}

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ConvertPage({ pluginId, onBack }: ConvertPageProps) {
  const [plugin, setPlugin] = useState<PluginManifest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [options, setOptions] = useState<Record<string, any>>({});
  const [outputDir, setOutputDir] = useState('');
  const [autoOpen, setAutoOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubs = useRef<(() => void)[]>([]);

  // 加载插件信息
  useEffect(() => {
    window.toolbox.getPlugin(pluginId).then((p: PluginManifest | undefined) => {
      if (!p) {
        setNotFound(true);
        return;
      }
      setPlugin(p);
      // 根据 schema 初始化选项
      if (p.configSchema?.properties) {
        const initial: Record<string, any> = {};
        for (const [k, s] of Object.entries<any>(p.configSchema.properties)) {
          initial[k] = s.default;
        }
        setOptions(initial);
      }
    });
    window.toolbox.getSettings().then((s: Record<string, unknown>) => {
      setOutputDir((s.outputDir as string) || '');
    });

    const off1 = window.toolbox.onTaskProgress(({ taskId: id, progress: p }) => {
      if (id === taskId) setProgress(p);
    });
    const off2 = window.toolbox.onTaskCompleted(({ taskId: id, files }) => {
      if (id === taskId) {
        setRunning(false);
        setProgress({ percent: 100, stage: '完成' });
        message.success(`转换完成! 输出 ${files.length} 个文件`);
        if (autoOpen && files.length > 0) {
          window.toolbox.openDir(files[0]);
        }
      }
    });
    const off3 = window.toolbox.onTaskFailed(({ taskId: id, error }) => {
      if (id === taskId) {
        setRunning(false);
        setError(error);
        message.error(`转换失败`);
      }
    });

    unsubs.current = [off1, off2, off3];
    return () => unsubs.current.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pluginId]);

  const updateOption = useCallback((key: string, value: any) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectFiles = async () => {
    const paths = await window.toolbox.selectFilesMultiple();
    if (paths && paths.length > 0) {
      const infos: FileInfo[] = paths.map((p: string) => ({
        path: p,
        name: p.split(/[\\/]/).pop() || p,
        size: 0,
        mimeType: '',
      }));
      setFiles(infos);
      setError(null);
      if (!outputDir) {
        const dir = paths[0].replace(/[\\/][^\\/]+$/, '');
        setOutputDir(dir);
      }
    }
  };

  const handleSelectOutputDir = async () => {
    const dir = await window.toolbox.selectDirectory();
    if (dir) setOutputDir(dir);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragging');
    const items = Array.from(e.dataTransfer.files) as any[];
    if (items.length > 0) {
      const infos: FileInfo[] = items.map((f: any) => ({
        path: f.path,
        name: f.name,
        size: f.size || 0,
        mimeType: f.type || '',
      }));
      setFiles(infos);
      setError(null);
      if (!outputDir && items[0].path) {
        setOutputDir(items[0].path.replace(/[\\/][^\\/]+$/, ''));
      }
    }
  };

  const handleStart = async () => {
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }
    try {
      setRunning(true);
      setError(null);
      setProgress({ percent: 0, stage: '准备中...' });
      const id = await window.toolbox.startTask({
        pluginId,
        inputs: files,
        options: { ...options, outputDir },
      });
      setTaskId(id);
    } catch (err: unknown) {
      setRunning(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      message.error('启动失败');
    }
  };

  // 找不到插件 → 友好错误页
  if (notFound) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <Title level={4}>功能模块未找到</Title>
        <Paragraph type="secondary">
          插件 ID "{pluginId}" 不存在或加载失败。
          <br />
          请尝试重启应用或联系开发者。
        </Paragraph>
        <Button type="primary" onClick={onBack}>返回首页</Button>
      </div>
    );
  }

  // 加载 manifest 中
  if (!plugin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  const schema = plugin.configSchema;
  const properties = schema?.properties || {};

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

      <Paragraph type="secondary">{plugin.description}</Paragraph>

      {/* 文件选择 */}
      <Card
        title={<><FileOutlined /> 选择文件</>}
        style={{ marginTop: 24 }}
        styles={{ body: { padding: '20px' } }}
      >
        <div
          className="drop-zone"
          onClick={handleSelectFiles}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('dragging');
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
          onDrop={handleDrop}
        >
          {files.length > 0 ? (
            <div>
              <div style={{ fontSize: 15, color: '#1a1a1a', marginBottom: 8 }}>
                已选择 <Text strong>{files.length}</Text> 个文件
              </div>
              {files.slice(0, 5).map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  📄 {f.name}{f.size > 0 ? ` (${humanFileSize(f.size)})` : ''}
                </div>
              ))}
              {files.length > 5 && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  ...还有 {files.length - 5} 个
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 16, color: '#555' }}>
                点击选择 或 拖拽文件到此处
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                支持: {plugin.inputFormats.map((f) => `.${f}`).join(' / ')}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 配置（动态） */}
      {Object.keys(properties).length > 0 && (
        <Card title="⚙️ 转换设置" style={{ marginTop: 16 }} styles={{ body: { padding: '20px' } }}>
          <Row gutter={[16, 16]}>
            {Object.entries(properties).map(([key, s]) => (
              <Col span={s.type === 'boolean' ? 8 : 12} key={key}>
                <SchemaField
                  name={key}
                  schema={s}
                  value={options[key]}
                  onChange={(v: any) => updateOption(key, v)}
                  disabled={running}
                />
              </Col>
            ))}
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>输出目录</Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={handleSelectOutputDir}
                    disabled={running}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    {outputDir || '默认 (源文件所在目录)'}
                  </Button>
                </Space.Compact>
              </Space>
            </Col>
            <Col>
              <Space direction="vertical">
                <Text strong>完成后自动打开</Text>
                <Switch
                  checked={autoOpen}
                  onChange={setAutoOpen}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  disabled={running}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 执行 */}
      <Card
        title="▶️ 执行转换"
        style={{ marginTop: 16 }}
        styles={{ body: { padding: '20px' } }}
      >
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

        {error && (
          <div style={{ marginTop: 16, padding: 12, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
            <Text type="danger" style={{ fontSize: 12 }}>
              ❌ {error}
            </Text>
          </div>
        )}

        {progress && (
          <div style={{ marginTop: 20 }}>
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Space>
                {running && <span className="ant-spin-dot" style={{ display: 'inline-block' }} />}
                <Text>{progress.stage}</Text>
              </Space>
              <Text type="secondary">{progress.percent}%</Text>
            </Row>
            <Progress
              percent={progress.percent}
              status={running ? 'active' : progress.percent === 100 ? 'success' : 'exception'}
              strokeColor={
                progress.percent === 100
                  ? { from: '#1677ff', to: '#52c41a' }
                  : { from: '#1677ff', to: '#69b1ff' }
              }
            />
            {progress.detail && (
              <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                {progress.detail}
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
