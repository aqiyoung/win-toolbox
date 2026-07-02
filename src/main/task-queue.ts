/**
 * Task Queue — 任务并发队列
 *
 * 控制同时运行的任务数,提供暂停/恢复/取消能力
 */

import { randomUUID } from 'crypto';
import type { Task, TaskStatus, ProgressInfo, Plugin, FileInfo } from '@shared/types';
import { DEFAULT_MAX_CONCURRENT } from '@shared/constants';

interface TaskItem {
  id: string;
  plugin: Plugin;
  inputs: FileInfo[];
  options: Record<string, unknown>;
  status: TaskStatus;
  progress: ProgressInfo;
  abortController: AbortController;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  outputFiles?: string[];
  error?: string;
  onProgress: (p: ProgressInfo) => void;
  onCompleted: (files: string[]) => void;
  onError: (err: Error) => void;
}

export class TaskQueue {
  private tasks = new Map<string, TaskItem>();
  private queue: string[] = [];
  private running = new Set<string>();
  private maxConcurrent: number = DEFAULT_MAX_CONCURRENT;

  setMaxConcurrent(n: number): void {
    this.maxConcurrent = n;
    this.tick();
  }

  /**
   * 入队一个新任务,返回 taskId
   */
  async enqueue(params: {
    plugin: Plugin;
    inputs: FileInfo[];
    options: Record<string, unknown>;
    onProgress: (p: ProgressInfo) => void;
    onCompleted: (files: string[]) => void;
    onError: (err: Error) => void;
  }): Promise<string> {
    const id = randomUUID();

    // 校验
    const vali = await params.plugin.validate(params.inputs);
    if (!vali.valid) {
      throw new Error(vali.errors.join('; '));
    }

    const item: TaskItem = {
      id,
      plugin: params.plugin,
      inputs: params.inputs,
      options: params.options,
      status: 'pending',
      progress: { percent: 0, stage: '等待中' },
      abortController: new AbortController(),
      createdAt: Date.now(),
      onProgress: params.onProgress,
      onCompleted: params.onCompleted,
      onError: params.onError,
    };

    this.tasks.set(id, item);
    this.queue.push(id);
    this.tick();

    return id;
  }

  /** 取消任务 */
  cancel(taskId: string): void {
    const item = this.tasks.get(taskId);
    if (!item) return;

    item.abortController.abort();
    item.status = 'cancelled';
    item.completedAt = Date.now();

    // 从队列移除
    this.queue = this.queue.filter((id) => id !== taskId);
    this.running.delete(taskId);

    this.tick();
  }

  /** 列出所有任务(用于历史) */
  list(): Task[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({
        id: t.id,
        pluginId: t.plugin.id,
        pluginName: t.plugin.name,
        inputs: t.inputs,
        options: t.options,
        status: t.status,
        progress: t.progress,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
        outputFiles: t.outputFiles,
        error: t.error,
      }));
  }

  /**
   * 驱动队列:从队头取任务,有空闲槽就启动
   */
  private tick(): void {
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const nextId = this.queue.shift()!;
      this.runTask(nextId);
    }
  }

  /** 执行单个任务 */
  private async runTask(id: string): Promise<void> {
    const item = this.tasks.get(id);
    if (!item || item.status === 'cancelled') return;

    item.status = 'running';
    item.startedAt = Date.now();
    this.running.add(id);

    const checkAborted = () => {
      if (item.abortController.signal.aborted) {
        throw new DOMException('用户取消', 'AbortError');
      }
    };

    try {
      const result = await item.plugin.convert(
        item.inputs,
        item.options,
        (progress) => {
          checkAborted();
          item.progress = progress;
          item.onProgress(progress);
        },
      );

      checkAborted();

      item.status = 'completed';
      item.progress = { percent: 100, stage: '完成' };
      item.outputFiles = result.outputFiles;
      item.completedAt = Date.now();

      // 通知前端
      item.onProgress(item.progress);
      item.onCompleted(result.outputFiles);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        item.status = 'cancelled';
      } else {
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : String(err);
        item.completedAt = Date.now();
        item.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.running.delete(id);
      this.tick(); // 驱动下一个
    }
  }
}
